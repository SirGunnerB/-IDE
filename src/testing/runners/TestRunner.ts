import { EventEmitter } from 'events';
import { Logger } from '../../utils/Logger';
import { Performance } from '../../utils/Performance';
import { TestResult, TestSuite, TestStatus } from '../../types';
import { WorkerPool } from './WorkerPool';
import { CoverageCollector } from '../coverage/CoverageCollector';

export class TestRunner extends EventEmitter {
  private readonly logger = new Logger('TestRunner');
  private readonly performance = new Performance();
  private readonly workerPool: WorkerPool;
  private readonly coverage: CoverageCollector;

  constructor(private readonly config: TestRunnerConfig) {
    super();
    this.workerPool = new WorkerPool(config.workers || 4);
    this.coverage = new CoverageCollector(config.coverage);
  }

  async runSuite(suite: TestSuite): Promise<TestResult[]> {
    this.logger.info(`Running test suite: ${suite.name}`);
    const startTime = this.performance.start();

    try {
      await this.runHooks('beforeAll', suite);
      const results = await this.runTests(suite);
      await this.runHooks('afterAll', suite);

      const duration = this.performance.end(startTime);
      this.logger.info(`Suite completed in ${this.performance.formatDuration(duration)}`);

      return results;
    } catch (error) {
      this.logger.error(`Suite failed: ${suite.name}`, error);
      throw error;
    }
  }

  private async runTests(suite: TestSuite): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const tests = this.flattenTests(suite);

    for (const test of tests) {
      try {
        await this.runHooks('beforeEach', suite);
        
        const result = await this.runTest(test);
        results.push(result);
        
        await this.runHooks('afterEach', suite);

        if (result.status === 'failed' && this.config.bail) {
          break;
        }
      } catch (error) {
        this.logger.error(`Test failed: ${test.name}`, error);
        results.push(this.createFailedResult(test, error));
        
        if (this.config.bail) {
          break;
        }
      }
    }

    return results;
  }

  private async runTest(test: any): Promise<TestResult> {
    const startTime = this.performance.start();
    this.emit('testStart', test);

    try {
      if (this.config.parallel) {
        await this.workerPool.execute(test);
      } else {
        await test.fn();
      }

      const coverage = await this.coverage.collect();
      const result = this.createSuccessResult(test, startTime, coverage);
      
      this.emit('testComplete', result);
      return result;
    } catch (error) {
      const result = this.createFailedResult(test, error);
      this.emit('testComplete', result);
      throw error;
    }
  }

  private async runHooks(type: string, suite: TestSuite): Promise<void> {
    const hooks = suite[type] || [];
    for (const hook of hooks) {
      await hook();
    }
  }

  private flattenTests(suite: TestSuite): any[] {
    const tests: any[] = [];
    
    for (const test of suite.tests) {
      if (test instanceof TestSuite) {
        tests.push(...this.flattenTests(test));
      } else {
        tests.push(test);
      }
    }

    return tests;
  }

  private createSuccessResult(test: any, startTime: number, coverage: any): TestResult {
    return {
      id: test.id,
      name: test.name,
      status: 'passed' as TestStatus,
      duration: this.performance.end(startTime),
      coverage,
      startTime,
      endTime: Date.now()
    };
  }

  private createFailedResult(test: any, error: Error): TestResult {
    return {
      id: test.id,
      name: test.name,
      status: 'failed' as TestStatus,
      duration: 0,
      error,
      startTime: Date.now(),
      endTime: Date.now()
    };
  }

  async cleanup(): Promise<void> {
    await this.workerPool.cleanup();
    await this.coverage.cleanup();
  }
} 
import { Test, TestResult, TestConfig, TestStatus } from '../types';
import { WorkerPool } from './WorkerPool';
import { ResultCache } from './ResultCache';
import { Logger } from '../utils/Logger';
import { Performance } from '../utils/Performance';
import { EventEmitter } from 'events';

export class TestRunner extends EventEmitter {
  private readonly workerPool: WorkerPool;
  private readonly resultCache: ResultCache;
  private readonly logger: Logger;
  private readonly performance: Performance;
  private readonly config: TestConfig;

  constructor(config: TestConfig) {
    super();
    this.config = config;
    this.workerPool = new WorkerPool(config.maxWorkers);
    this.resultCache = new ResultCache();
    this.logger = new Logger('TestRunner');
    this.performance = new Performance();
  }

  async runTests(tests: Test[]): Promise<TestResult[]> {
    const startTime = this.performance.start();
    const results: TestResult[] = [];
    const chunks = this.chunkTests(tests);

    try {
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(test => this.runTest(test))
        );
        results.push(...chunkResults);

        if (this.shouldBail(results)) {
          break;
        }
      }

      this.emitResults(results, startTime);
      return results;
    } catch (error) {
      this.logger.error('Test execution failed', error);
      throw error;
    }
  }

  private chunkTests(tests: Test[]): Test[][] {
    const chunkSize = this.config.maxWorkers;
    const chunks: Test[][] = [];
    
    for (let i = 0; i < tests.length; i += chunkSize) {
      chunks.push(tests.slice(i, i + chunkSize));
    }
    
    return chunks;
  }

  private shouldBail(results: TestResult[]): boolean {
    return this.config.bail && results.some(r => r.status === 'failed');
  }

  private emitResults(results: TestResult[], startTime: number): void {
    const duration = this.performance.end(startTime);
    this.emit('complete', { results, duration });
  }

  async runTest(test: Test): Promise<TestResult> {
    const startTime = this.performance.start();

    try {
      // Check cache first
      if (this.config.cache) {
        const cached = await this.resultCache.get(test.id);
        if (cached) {
          this.logger.debug(`Cache hit for test: ${test.name}`);
          return cached;
        }
      }

      const result = await this.executeTest(test);
      
      // Cache successful results
      if (result.status === 'passed' && this.config.cache) {
        await this.resultCache.set(test.id, result);
      }

      return result;
    } catch (error) {
      return this.createFailedResult(test, error, startTime);
    }
  }

  private async executeTest(test: Test): Promise<TestResult> {
    const worker = await this.workerPool.acquire();
    
    try {
      const result = await this.runWithTimeout(worker.execute(test), test.timeout);
      return this.createSuccessResult(test, result);
    } finally {
      await this.workerPool.release(worker);
    }
  }

  private async runWithTimeout<T>(
    promise: Promise<T>, 
    timeout?: number
  ): Promise<T> {
    const timeoutMs = timeout || this.config.timeout || 5000;

    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout: ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private createSuccessResult(test: Test, result: any): TestResult {
    return {
      id: test.id,
      name: test.name,
      status: 'passed' as TestStatus,
      duration: this.performance.end(result.startTime),
      startTime: result.startTime,
      endTime: Date.now(),
      metadata: result.metadata
    };
  }

  private createFailedResult(
    test: Test, 
    error: unknown, 
    startTime: number
  ): TestResult {
    return {
      id: test.id,
      name: test.name,
      status: 'failed' as TestStatus,
      duration: this.performance.end(startTime),
      startTime,
      endTime: Date.now(),
      error: error instanceof Error ? error : new Error(String(error))
    };
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.workerPool.cleanup(),
      this.resultCache.clear()
    ]);
  }
} 
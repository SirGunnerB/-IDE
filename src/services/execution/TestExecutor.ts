import { Test, TestResult, TestConfig } from '../../types';
import { Logger } from '../../utils/Logger';
import { EventEmitter } from 'events';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';

export class TestExecutor extends EventEmitter {
  private readonly logger: Logger;
  private readonly monitor: PerformanceMonitor;
  private readonly config: TestConfig;

  constructor(config: TestConfig) {
    super();
    this.config = config;
    this.logger = new Logger('TestExecutor');
    this.monitor = new PerformanceMonitor();
  }

  async execute(test: Test): Promise<TestResult> {
    this.logger.debug(`Executing test: ${test.name}`);
    let retries = 0;
    let lastError: Error | undefined;

    while (retries <= (test.retries ?? this.config.retries ?? 0)) {
      try {
        const result = await this.runSingleTest(test);
        
        if (result.status === 'passed') {
          return result;
        }
        
        lastError = result.error;
        retries++;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retries++;
      }

      if (retries <= (test.retries ?? this.config.retries ?? 0)) {
        this.logger.warn(`Retrying test: ${test.name} (Attempt ${retries + 1})`);
        await this.delay(1000 * retries); // Exponential backoff
      }
    }

    return {
      id: test.id,
      name: test.name,
      status: 'failed',
      duration: 0,
      startTime: Date.now(),
      endTime: Date.now(),
      error: lastError,
      retries
    };
  }

  private async runSingleTest(test: Test): Promise<TestResult> {
    const timeout = test.timeout ?? this.config.timeout ?? 5000;
    const startTime = Date.now();

    try {
      // Start performance monitoring
      this.monitor.startTest(test.id);

      // Execute test with timeout
      await Promise.race([
        test.fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
        )
      ]);

      const endTime = Date.now();
      const metrics = this.monitor.endTest(test.id);

      const result: TestResult = {
        id: test.id,
        name: test.name,
        status: 'passed',
        duration: endTime - startTime,
        startTime,
        endTime,
        metrics
      };

      this.emit('testComplete', result);
      return result;

    } catch (error) {
      const endTime = Date.now();
      const metrics = this.monitor.endTest(test.id);

      const result: TestResult = {
        id: test.id,
        name: test.name,
        status: 'failed',
        duration: endTime - startTime,
        startTime,
        endTime,
        error: error instanceof Error ? error : new Error(String(error)),
        metrics
      };

      this.emit('testError', result);
      return result;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
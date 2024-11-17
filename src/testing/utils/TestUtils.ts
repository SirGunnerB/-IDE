import { Logger } from '../../utils/Logger';
import { Performance } from '../../utils/Performance';
import { DataGenerator } from '../generators/DataGenerator';
import { MockFactory } from '../mocks/MockFactory';
import { FixtureManager } from '../fixtures/FixtureManager';

export class TestUtils {
  private static instance: TestUtils;
  private readonly logger: Logger;
  private readonly performance: Performance;
  private readonly generator: DataGenerator;
  private readonly mockFactory: MockFactory;
  private readonly fixtures: FixtureManager;

  private constructor(config: TestUtilsConfig) {
    this.logger = new Logger('TestUtils');
    this.performance = new Performance();
    this.generator = new DataGenerator(config.seed);
    this.mockFactory = new MockFactory();
    this.fixtures = new FixtureManager(config.fixtures);
  }

  static getInstance(config?: TestUtilsConfig): TestUtils {
    if (!TestUtils.instance) {
      TestUtils.instance = new TestUtils(config || {});
    }
    return TestUtils.instance;
  }

  async waitFor(
    condition: () => Promise<boolean> | boolean,
    options: WaitOptions = {}
  ): Promise<void> {
    const {
      timeout = 5000,
      interval = 100,
      message = 'Condition not met'
    } = options;

    const startTime = this.performance.start();

    while (true) {
      if (await condition()) {
        return;
      }

      if (this.performance.end(startTime) > timeout) {
        throw new Error(message);
      }

      await this.delay(interval);
    }
  }

  async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      attempts = 3,
      delay = 1000,
      backoff = 2,
      onRetry
    } = options;

    let lastError: Error;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === attempts) {
          throw error;
        }

        if (onRetry) {
          onRetry(error, attempt);
        }

        await this.delay(currentDelay);
        currentDelay *= backoff;
      }
    }

    throw lastError!;
  }

  async withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    message?: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(message || `Operation timed out after ${timeout}ms`));
      }, timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  mockDate(date: Date | number | string = new Date()): void {
    const mockDate = new Date(date);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  }

  restoreDate(): void {
    jest.spyOn(global, 'Date').mockRestore();
  }

  async isolateTest<T>(fn: () => Promise<T>): Promise<T> {
    const originalEnv = { ...process.env };
    
    try {
      return await fn();
    } finally {
      process.env = originalEnv;
      this.mockFactory.restoreAll();
      await this.fixtures.clear();
    }
  }

  createTestContext(): TestContext {
    return {
      fixtures: this.fixtures,
      mocks: this.mockFactory,
      generate: this.generator,
      performance: this.performance
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface WaitOptions {
  timeout?: number;
  interval?: number;
  message?: string;
}

interface RetryOptions {
  attempts?: number;
  delay?: number;
  backoff?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

interface TestContext {
  fixtures: FixtureManager;
  mocks: MockFactory;
  generate: DataGenerator;
  performance: Performance;
}

// Export convenience functions
export const {
  waitFor,
  retry,
  withTimeout,
  mockDate,
  restoreDate,
  isolateTest,
  createTestContext
} = TestUtils.getInstance(); 
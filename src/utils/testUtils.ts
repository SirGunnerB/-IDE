import { Test, TestContext, TestSuite } from '../types';
import { Performance } from './Performance';
import { Logger } from './Logger';
import * as crypto from 'crypto';

export class TestUtils {
  private static instance: TestUtils;
  private readonly performance = new Performance();
  private readonly logger = Logger.getInstance('TestUtils');
  private readonly suites: Map<string, TestSuite> = new Map();
  private currentSuite: TestSuite | null = null;

  static getInstance(): TestUtils {
    if (!TestUtils.instance) {
      TestUtils.instance = new TestUtils();
    }
    return TestUtils.instance;
  }

  describe(name: string, fn: () => void): void {
    const suite: TestSuite = {
      name,
      tests: [],
      beforeAll: [],
      afterAll: [],
      beforeEach: [],
      afterEach: []
    };

    const parent = this.currentSuite;
    this.currentSuite = suite;

    try {
      fn();
    } finally {
      this.currentSuite = parent;
    }

    if (parent) {
      parent.tests.push(suite);
    } else {
      this.suites.set(name, suite);
    }
  }

  test(name: string, fn: (context: TestContext) => Promise<void>, options: any = {}): void {
    if (!this.currentSuite) {
      throw new Error('Test must be defined within a describe block');
    }

    const test: Test = {
      id: crypto.randomUUID(),
      name,
      filePath: '',  // Add this line to match the Test interface
      fn: this.wrapTestFunction(fn),
      suite: this.currentSuite,
      ...options
    };

    this.currentSuite.tests.push(test);
  }

  beforeAll(fn: () => Promise<void> | void): void {
    this.addHook('beforeAll', fn);
  }

  afterAll(fn: () => Promise<void> | void): void {
    this.addHook('afterAll', fn);
  }

  beforeEach(fn: () => Promise<void> | void): void {
    this.addHook('beforeEach', fn);
  }

  afterEach(fn: () => Promise<void> | void): void {
    this.addHook('afterEach', fn);
  }

  private addHook(type: keyof Pick<TestSuite, 'beforeAll' | 'afterAll' | 'beforeEach' | 'afterEach'>, fn: () => Promise<void> | void): void {
    if (!this.currentSuite) {
      throw new Error(`${type} must be called within a describe block`);
    }
    this.currentSuite[type].push(fn);
  }

  private wrapTestFunction(
    fn: (context: TestContext) => Promise<void>
  ): () => Promise<void> {
    return async () => {
      const context: TestContext = {
        performance: this.performance,
        logger: {
          log: (message: string) => this.logger.info(message),
          error: (message: string) => this.logger.error(message)
        }
      };

      this.performance.mark('testStart');
      
      try {
        await fn(context);
        this.performance.mark('testEnd');
        
        const duration = this.performance.measure(
          'testDuration',
          'testStart',
          'testEnd'
        );

        this.logger.debug(`Test completed in ${this.performance.formatDuration(duration)}`);
      } catch (error) {
        this.performance.mark('testEnd');
        throw error;
      }
    };
  }

  async runSuites(): Promise<void> {
    for (const [name, suite] of this.suites) {
      this.logger.info(`Running suite: ${name}`);
      await this.runSuite(suite);
    }
  }

  private async runSuite(suite: TestSuite): Promise<void> {
    try {
      // Run beforeAll hooks
      for (const hook of suite.beforeAll) {
        await hook();
      }

      // Run tests
      for (const test of suite.tests) {
        if ('tests' in test) {
          await this.runSuite(test as TestSuite);
        } else {
          await this.runTest(test as Test, suite);
        }
      }

      // Run afterAll hooks
      for (const hook of suite.afterAll) {
        await hook();
      }
    } catch (error) {
      this.logger.error(`Suite failed: ${suite.name}`, error as Error);
      throw error;
    }
  }

  private async runTest(test: Test, suite: TestSuite): Promise<void> {
    try {
      // Run beforeEach hooks
      for (const hook of suite.beforeEach) {
        await hook();
      }

      await test.fn();

      // Run afterEach hooks
      for (const hook of suite.afterEach) {
        await hook();
      }
    } catch (error) {
      this.logger.error(`Test failed: ${test.name}`, error as Error);
      throw error;
    }
  }
}

// Export convenience functions
export const { describe, test, beforeAll, afterAll, beforeEach, afterEach } = 
  TestUtils.getInstance(); 
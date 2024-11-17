interface TestSuite {
  id: string;
  name: string;
  file: string;
  tests: Test[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

interface Test {
  id: string;
  name: string;
  suite: string;
  fn: () => Promise<void>;
  timeout?: number;
  retries?: number;
  tags?: string[];
}

interface TestRunner {
  id: string;
  name: string;
  supports: (file: string) => boolean;
  runTest: (test: Test) => Promise<TestResult>;
}

export class TestingFrameworkService {
  private suites: Map<string, TestSuite> = new Map();
  private runners: Map<string, TestRunner> = new Map();
  private results: Map<string, TestResult[]> = new Map();
  private reporters: TestReporter[] = [];

  async runTests(pattern?: string): Promise<TestResult[]> {
    const suitesToRun = pattern 
      ? this.filterSuites(pattern)
      : Array.from(this.suites.values());

    const results: TestResult[] = [];

    for (const suite of suitesToRun) {
      try {
        // Setup suite environment
        await this.setupSuiteEnvironment(suite);
        
        // Run beforeAll hooks
        await suite.beforeAll?.();
        
        // Run tests
        for (const test of suite.tests) {
          const result = await this.runTest(test, suite);
          results.push(result);
          await this.reportTestResult(result);
        }
        
        // Run afterAll hooks
        await suite.afterAll?.();
      } catch (error) {
        this.handleSuiteError(suite, error);
      } finally {
        await this.cleanupSuiteEnvironment(suite);
      }
    }

    await this.generateTestReport(results);
    return results;
  }

  private async runTest(test: Test, suite: TestSuite): Promise<TestResult> {
    const runner = this.runners.get(suite.id);
    if (!runner) throw new Error(`No runner found for suite: ${suite.id}`);

    const result: TestResult = {
      id: test.id,
      name: test.name,
      suite: suite.name,
      status: 'running',
      startTime: Date.now(),
      duration: 0,
      retries: 0
    };

    try {
      // Run beforeEach hooks
      await suite.beforeEach?.();
      
      // Run test with timeout
      await this.runWithTimeout(test);
      
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      result.error = error;
      
      // Handle retries
      if (test.retries && result.retries < test.retries) {
        result.retries++;
        return this.runTest(test, suite);
      }
    } finally {
      // Run afterEach hooks
      await suite.afterEach?.();
      
      result.duration = Date.now() - result.startTime;
    }

    return result;
  }

  private async runWithTimeout(test: Test): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Test timed out after ${test.timeout}ms`));
      }, test.timeout || 5000);

      test.fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  async addReporter(reporter: TestReporter): Promise<void> {
    this.reporters.push(reporter);
  }

  private async reportTestResult(result: TestResult): Promise<void> {
    for (const reporter of this.reporters) {
      await reporter.onTestResult(result);
    }
  }

  private async generateTestReport(results: TestResult[]): Promise<void> {
    const report = {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      results
    };

    for (const reporter of this.reporters) {
      await reporter.onComplete(report);
    }
  }
}

interface TestResult {
  id: string;
  name: string;
  suite: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  startTime: number;
  duration: number;
  error?: Error;
  retries: number;
}

interface TestReporter {
  onTestResult: (result: TestResult) => Promise<void>;
  onComplete: (report: any) => Promise<void>;
} 
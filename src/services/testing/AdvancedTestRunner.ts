interface TestRunnerConfig {
  parallel: boolean;
  maxWorkers: number;
  timeout: number;
  bail: boolean;
  coverage: boolean;
}

interface TestWorker {
  id: string;
  busy: boolean;
  tests: Test[];
  results: TestResult[];
}

export class AdvancedTestRunner {
  private workers: Map<string, TestWorker> = new Map();
  private coverageCollector: CoverageCollector;
  private testQueue: Test[] = [];

  async initialize(config: TestRunnerConfig): Promise<void> {
    // Initialize workers
    for (let i = 0; i < config.maxWorkers; i++) {
      const worker = await this.createWorker(i);
      this.workers.set(worker.id, worker);
    }

    if (config.coverage) {
      await this.setupCoverageCollection();
    }
  }

  async runTests(tests: Test[]): Promise<TestResult[]> {
    this.testQueue = [...tests];
    const results: TestResult[] = [];

    try {
      // Start coverage collection if enabled
      await this.coverageCollector?.start();

      // Run tests in parallel if configured
      if (this.config.parallel) {
        results.push(...await this.runParallel());
      } else {
        results.push(...await this.runSequential());
      }

      // Collect and merge coverage data
      if (this.config.coverage) {
        await this.processCoverageData();
      }

      return results;
    } catch (error) {
      this.handleRunnerError(error);
      throw error;
    }
  }

  private async runParallel(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const running: Promise<TestResult>[] = [];

    while (this.testQueue.length > 0 || running.length > 0) {
      // Fill available workers
      while (this.testQueue.length > 0 && running.length < this.config.maxWorkers) {
        const test = this.testQueue.shift()!;
        const worker = await this.getAvailableWorker();
        running.push(this.runTestInWorker(worker, test));
      }

      // Wait for any test to complete
      const result = await Promise.race(running);
      results.push(result);

      // Remove completed test from running array
      const index = running.findIndex(p => p.status === 'fulfilled');
      running.splice(index, 1);

      // Check if should bail on failure
      if (this.config.bail && result.status === 'failed') {
        break;
      }
    }

    return results;
  }

  private async runTestInWorker(worker: TestWorker, test: Test): Promise<TestResult> {
    try {
      worker.busy = true;

      // Setup test environment in worker
      await this.setupTestEnvironment(worker, test);

      // Execute test
      const result = await this.executeTest(worker, test);

      // Collect coverage data if enabled
      if (this.config.coverage) {
        await this.collectTestCoverage(worker, test);
      }

      return result;
    } finally {
      worker.busy = false;
    }
  }

  private async setupTestEnvironment(worker: TestWorker, test: Test): Promise<void> {
    await worker.send({
      type: 'setup',
      payload: {
        testId: test.id,
        environment: this.getTestEnvironment(test),
        globals: this.getTestGlobals(test)
      }
    });
  }

  private async collectTestCoverage(worker: TestWorker, test: Test): Promise<void> {
    const coverage = await worker.send({
      type: 'getCoverage',
      payload: { testId: test.id }
    });

    await this.coverageCollector.add(test.id, coverage);
  }
} 
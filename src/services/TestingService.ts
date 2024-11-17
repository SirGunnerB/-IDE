interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: Error;
}

export class TestingService {
  private testRunners: Map<string, TestRunner> = new Map();

  registerTestRunner(framework: string, runner: TestRunner) {
    this.testRunners.set(framework, runner);
  }

  async runTests(testFiles: string[], framework: string): Promise<TestResult[]> {
    const runner = this.testRunners.get(framework);
    if (!runner) {
      throw new Error(`No test runner found for framework: ${framework}`);
    }

    try {
      const results = await runner.runTests(testFiles);
      this.updateTestExplorer(results);
      return results;
    } catch (error) {
      console.error('Test execution failed:', error);
      throw error;
    }
  }
} 
import * as chokidar from 'chokidar';
import { Test, TestResult } from '../types';
import { TestRunner } from '../core/TestRunner';
import { ResultFormatter } from './ResultFormatter';
import { Logger } from './Logger';

export class WatchMode {
  private readonly logger = Logger.getInstance('WatchMode');
  private watcher?: chokidar.FSWatcher;

  constructor(
    private readonly runner: TestRunner,
    private readonly formatter: ResultFormatter
  ) {}

  async start(tests: Test[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    await this.runTests(tests, results);

    this.watcher = this.setupWatcher(tests, results);
    this.setupTerminationHandler();

    return results;
  }

  private setupWatcher(tests: Test[], results: TestResult[]): chokidar.FSWatcher {
    return chokidar
      .watch(tests.map(test => test.filePath))
      .on('change', async (path) => {
        this.logger.info(`File changed: ${path}`);
        await this.handleFileChange(path, tests, results);
      });
  }

  private async handleFileChange(
    path: string, 
    tests: Test[], 
    results: TestResult[]
  ): Promise<void> {
    delete require.cache[require.resolve(path)];
    await this.runTests(tests, results);
  }

  private async runTests(
    tests: Test[], 
    results: TestResult[]
  ): Promise<void> {
    results.length = 0;
    
    for (const test of tests) {
      results.push(await this.runner.runTest(test));
    }

    console.clear();
    console.log(this.formatter.format(results));
  }

  private setupTerminationHandler(): void {
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  async cleanup(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }
    await this.runner.cleanup();
  }
} 
import { TestResult, ReporterConfig } from '../types';
import { Logger } from '../utils/Logger';
import { Performance } from '../utils/Performance';
import { FileSystem } from '../utils/FileSystem';
import { EventEmitter } from 'events';

export abstract class TestReporter extends EventEmitter {
  protected readonly logger: Logger;
  protected readonly performance: Performance;
  protected readonly fs: FileSystem;

  constructor(
    protected readonly config: ReporterConfig
  ) {
    super();
    this.logger = new Logger(`Reporter:${this.name}`);
    this.performance = new Performance();
    this.fs = new FileSystem();
  }

  abstract get name(): string;

  abstract onTestStart(test: TestResult): Promise<void>;
  abstract onTestComplete(test: TestResult): Promise<void>;
  abstract onRunComplete(results: TestResult[]): Promise<void>;

  protected formatDuration(ms: number): string {
    return this.performance.formatDuration(ms);
  }

  protected getStatusIcon(status: string): string {
    const icons = {
      passed: '✅',
      failed: '❌',
      skipped: '⏭️',
      running: '🔄'
    };
    return icons[status] || '❓';
  }
}

export class ConsoleReporter extends TestReporter {
  get name(): string {
    return 'console';
  }

  async onTestStart(test: TestResult): Promise<void> {
    console.log(`${this.getStatusIcon('running')} Running: ${test.name}`);
  }

  async onTestComplete(test: TestResult): Promise<void> {
    console.log(
      `${this.getStatusIcon(test.status)} ${test.name}: ${test.status} ` +
      `(${this.formatDuration(test.duration)})`
    );

    if (test.error) {
      console.error('\nError:', test.error);
      console.error('Stack:', test.error.stack);
    }
  }

  async onRunComplete(results: TestResult[]): Promise<void> {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const duration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`
Test Run Complete
----------------
Total:   ${total}
Passed:  ${passed} ${this.getStatusIcon('passed')}
Failed:  ${failed} ${this.getStatusIcon('failed')}
Skipped: ${skipped} ${this.getStatusIcon('skipped')}
Time:    ${this.formatDuration(duration)}
    `);
  }
}

export class HtmlReporter extends TestReporter {
  private template: string;

  constructor(config: ReporterConfig) {
    super(config);
    this.template = this.loadTemplate();
  }

  get name(): string {
    return 'html';
  }

  private loadTemplate(): string {
    return this.fs.readFileSync(
      this.config.templatePath || './templates/report.html',
      'utf-8'
    );
  }

  async onTestStart(test: TestResult): Promise<void> {
    // Update progress in HTML
  }

  async onTestComplete(test: TestResult): Promise<void> {
    // Update test result in HTML
  }

  async onRunComplete(results: TestResult[]): Promise<void> {
    const html = this.generateHtml(results);
    await this.fs.writeFile(
      `${this.config.outputDir}/report.html`,
      html
    );
  }

  private generateHtml(results: TestResult[]): string {
    // Generate HTML report using template
    return this.template
      .replace('{{results}}', JSON.stringify(results))
      .replace('{{summary}}', this.generateSummary(results));
  }

  private generateSummary(results: TestResult[]): string {
    // Generate summary HTML
    return ``;
  }
} 
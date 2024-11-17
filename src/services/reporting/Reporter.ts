import { TestResult, ReportConfig, ReportFormat } from '../../types';
import { Logger } from '../../utils/Logger';
import { ReportGenerator } from './ReportGenerator';
import * as fs from 'fs/promises';
import * as path from 'path';

export class Reporter {
  private readonly logger: Logger;
  private readonly generator: ReportGenerator;
  private readonly config: ReportConfig;
  private results: TestResult[] = [];

  constructor(config: ReportConfig) {
    this.config = config;
    this.logger = new Logger('Reporter');
    this.generator = new ReportGenerator();
  }

  addResult(result: TestResult): void {
    this.results.push(result);
  }

  async generateReport(): Promise<void> {
    this.logger.info('Generating test report');

    try {
      const report = await this.generator.generate({
        results: this.results,
        config: this.config
      });

      await this.saveReport(report);
      
      if (this.config.formats?.includes('console')) {
        this.printSummary();
      }

    } catch (error) {
      this.logger.error('Failed to generate report', error);
      throw error;
    }
  }

  private async saveReport(report: any): Promise<void> {
    const formats = this.config.formats ?? ['json'];
    const outputDir = this.config.outputDir ?? 'reports';

    await fs.mkdir(outputDir, { recursive: true });

    for (const format of formats) {
      if (format === 'console') continue;

      const fileName = `report-${Date.now()}.${format}`;
      const filePath = path.join(outputDir, fileName);

      try {
        const content = await this.formatReport(report, format);
        await fs.writeFile(filePath, content);
        this.logger.info(`Report saved: ${filePath}`);
      } catch (error) {
        this.logger.error(`Failed to save report in ${format} format`, error);
      }
    }
  }

  private async formatReport(report: any, format: ReportFormat): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'html':
        return this.generator.toHTML(report);
      case 'markdown':
        return this.generator.toMarkdown(report);
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  private printSummary(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    console.log('\nTest Summary:');
    console.log('=============');
    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log('=============\n');

    if (failed > 0) {
      console.log('Failed Tests:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`- ${r.name}: ${r.error?.message}`);
        });
    }
  }
} 
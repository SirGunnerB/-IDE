import { TestResult, ReportConfig, ReportData } from '../../types';
import { Logger } from '../../utils/Logger';
import * as Handlebars from 'handlebars';
import * as path from 'path';
import * as fs from 'fs/promises';

export class ReportGenerator {
  private readonly logger: Logger;
  private readonly templates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor() {
    this.logger = new Logger('ReportGenerator');
    this.registerHelpers();
    this.loadTemplates();
  }

  async generate(data: ReportData): Promise<any> {
    this.logger.debug('Generating report');

    const reportData = {
      ...this.generateSummary(data.results),
      tests: this.processTestResults(data.results),
      timestamp: new Date().toISOString(),
      config: data.config
    };

    return reportData;
  }

  async toHTML(report: any): Promise<string> {
    const template = this.templates.get('html');
    if (!template) {
      throw new Error('HTML template not found');
    }

    return template(report);
  }

  async toMarkdown(report: any): Promise<string> {
    const template = this.templates.get('markdown');
    if (!template) {
      throw new Error('Markdown template not found');
    }

    return template(report);
  }

  private generateSummary(results: TestResult[]) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      summary: {
        total,
        passed,
        failed,
        skipped,
        passRate: (passed / total) * 100,
        totalDuration,
        startTime: Math.min(...results.map(r => r.startTime)),
        endTime: Math.max(...results.map(r => r.endTime))
      }
    };
  }

  private processTestResults(results: TestResult[]) {
    return results.map(result => ({
      ...result,
      durationFormatted: this.formatDuration(result.duration),
      startTimeFormatted: new Date(result.startTime).toLocaleString(),
      statusClass: this.getStatusClass(result.status)
    }));
  }

  private async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../../../templates');
      
      const htmlTemplate = await fs.readFile(
        path.join(templatesDir, 'report.html'),
        'utf-8'
      );
      this.templates.set('html', Handlebars.compile(htmlTemplate));

      const markdownTemplate = await fs.readFile(
        path.join(templatesDir, 'report.md'),
        'utf-8'
      );
      this.templates.set('markdown', Handlebars.compile(markdownTemplate));
    } catch (error) {
      this.logger.error('Failed to load templates', error);
    }
  }

  private registerHelpers() {
    Handlebars.registerHelper('formatDuration', this.formatDuration);
    Handlebars.registerHelper('formatDate', (timestamp: number) => {
      return new Date(timestamp).toLocaleString();
    });
    Handlebars.registerHelper('statusClass', this.getStatusClass);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds % 60}s`;
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'passed': return 'success';
      case 'failed': return 'danger';
      case 'skipped': return 'warning';
      default: return 'info';
    }
  }
} 
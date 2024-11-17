import { TestResult, ReportConfig, ReportFormat } from '../types';
import { Logger } from '../utils/Logger';
import { Performance } from '../utils/Performance';
import { Template } from './Template';
import { ReportTransformer } from './ReportTransformer';
import { FileSystem } from '../utils/FileSystem';

export class ReportGenerator {
  private readonly logger: Logger;
  private readonly performance: Performance;
  private readonly transformer: ReportTransformer;
  private readonly templates: Map<ReportFormat, Template>;

  constructor(
    private readonly config: ReportConfig,
    private readonly fs: FileSystem
  ) {
    this.logger = new Logger('ReportGenerator');
    this.performance = new Performance();
    this.transformer = new ReportTransformer();
    this.templates = this.loadTemplates();
  }

  async generateReport(results: TestResult[]): Promise<void> {
    this.performance.mark('reportStart');

    try {
      const reportData = this.transformer.transform(results);
      
      await Promise.all(
        this.config.formats.map(format => 
          this.generateForFormat(format, reportData)
        )
      );

      this.performance.mark('reportEnd');
      const duration = this.performance.measure(
        'reportGeneration',
        'reportStart',
        'reportEnd'
      );

      this.logger.info(`Reports generated in ${this.performance.formatDuration(duration)}`);
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
      throw error;
    }
  }

  private async generateForFormat(format: ReportFormat, data: any): Promise<void> {
    const template = this.templates.get(format);
    if (!template) {
      throw new Error(`No template found for format: ${format}`);
    }

    const content = await template.render(data);
    await this.saveReport(format, content);
  }

  private async saveReport(format: ReportFormat, content: string): Promise<void> {
    const fileName = this.getReportFileName(format);
    const filePath = this.fs.join(this.config.outputDir, fileName);

    await this.fs.ensureDir(this.config.outputDir);
    await this.fs.writeFile(filePath, content);

    this.logger.debug(`Report saved: ${filePath}`);
  }

  private getReportFileName(format: ReportFormat): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `report-${timestamp}.${format}`;
  }

  private loadTemplates(): Map<ReportFormat, Template> {
    const templates = new Map<ReportFormat, Template>();
    
    templates.set('html', new Template('html'));
    templates.set('json', new Template('json'));
    templates.set('markdown', new Template('markdown'));
    
    return templates;
  }
} 
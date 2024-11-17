import * as Handlebars from 'handlebars';
import { FileSystem } from '../utils/FileSystem';
import { Logger } from '../utils/Logger';
import path from 'path';

export class Template {
  private readonly template: Handlebars.TemplateDelegate;
  private readonly logger: Logger;

  constructor(
    private readonly format: string,
    private readonly fs: FileSystem = new FileSystem()
  ) {
    this.logger = new Logger(`Template:${format}`);
    this.template = this.compile();
    this.registerHelpers();
  }

  async render(data: any): Promise<string> {
    try {
      return this.template(data);
    } catch (error) {
      this.logger.error(`Template rendering failed:`, error);
      throw error;
    }
  }

  private compile(): Handlebars.TemplateDelegate {
    const templatePath = this.getTemplatePath();
    const templateContent = this.fs.readFileSync(templatePath, 'utf-8');
    return Handlebars.compile(templateContent);
  }

  private getTemplatePath(): string {
    return path.join(__dirname, `../../templates/${this.format}.hbs`);
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('formatDuration', (ms: number) => {
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    });

    Handlebars.registerHelper('formatDate', (timestamp: number) => {
      return new Date(timestamp).toLocaleString();
    });

    Handlebars.registerHelper('statusClass', (status: string) => {
      const classes = {
        passed: 'success',
        failed: 'danger',
        skipped: 'warning',
        running: 'info'
      };
      return classes[status] || 'default';
    });
  }
} 
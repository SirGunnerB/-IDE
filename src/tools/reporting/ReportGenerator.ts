import { Logger } from '../../utils/Logger';
import { FileSystem } from '../../utils/FileSystem';
import { Template } from './Template';
import { Chart } from './Chart';
import { Performance } from '../../utils/Performance';
import { format } from 'date-fns';

export class ReportGenerator {
  private readonly logger = new Logger('ReportGenerator');
  private readonly fs = new FileSystem();
  private readonly template: Template;
  private readonly chart: Chart;
  private readonly performance = new Performance();

  constructor(private readonly config: ReportConfig) {
    this.template = new Template(config.templates);
    this.chart = new Chart(config.charts);
  }

  async generate(data: ReportData): Promise<void> {
    const startTime = this.performance.start();
    this.logger.info('Starting report generation');

    try {
      const reportData = await this.preprocessData(data);
      const charts = await this.generateCharts(reportData);
      const report = await this.generateReport(reportData, charts);
      
      await this.saveReport(report);
      await this.generateSummary(reportData);

      const duration = this.performance.end(startTime);
      this.logger.info(`Report generation completed in ${this.performance.formatDuration(duration)}`);
    } catch (error) {
      this.logger.error('Report generation failed', error);
      throw error;
    }
  }

  private async preprocessData(data: ReportData): Promise<ProcessedReportData> {
    return {
      ...data,
      timestamp: new Date(),
      metrics: this.calculateMetrics(data),
      trends: await this.analyzeTrends(data)
    };
  }

  private calculateMetrics(data: ReportData): ReportMetrics {
    // Calculate various metrics from the data
    return {
      totalTests: data.tests.length,
      passedTests: data.tests.filter(t => t.status === 'passed').length,
      failedTests: data.tests.filter(t => t.status === 'failed').length,
      coverage: this.calculateCoverage(data.coverage),
      performance: this.calculatePerformanceMetrics(data.performance)
    };
  }

  private async analyzeTrends(data: ReportData): Promise<TrendAnalysis> {
    const historicalData = await this.loadHistoricalData();
    return {
      testTrends: this.calculateTestTrends(historicalData, data),
      coverageTrends: this.calculateCoverageTrends(historicalData, data),
      performanceTrends: this.calculatePerformanceTrends(historicalData, data)
    };
  }

  private async generateCharts(data: ProcessedReportData): Promise<ReportCharts> {
    return {
      testResults: await this.chart.generatePieChart({
        data: [
          { label: 'Passed', value: data.metrics.passedTests, color: 'green' },
          { label: 'Failed', value: data.metrics.failedTests, color: 'red' }
        ],
        title: 'Test Results'
      }),
      coverage: await this.chart.generateLineChart({
        data: data.trends.coverageTrends,
        title: 'Coverage Trends'
      }),
      performance: await this.chart.generateBarChart({
        data: data.trends.performanceTrends,
        title: 'Performance Trends'
      })
    };
  }

  private async generateReport(
    data: ProcessedReportData,
    charts: ReportCharts
  ): Promise<string> {
    const template = await this.template.load('report');
    return template.render({
      data,
      charts,
      config: this.config,
      formatters: {
        date: (date: Date) => format(date, 'yyyy-MM-dd HH:mm:ss'),
        duration: (ms: number) => this.performance.formatDuration(ms),
        percentage: (value: number) => `${(value * 100).toFixed(2)}%`
      }
    });
  }

  private async saveReport(report: string): Promise<void> {
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const filename = `report-${timestamp}.html`;
    const outputPath = `${this.config.outputDir}/${filename}`;

    await this.fs.ensureDir(this.config.outputDir);
    await this.fs.writeFile(outputPath, report);
    
    this.logger.info(`Report saved to: ${outputPath}`);
  }

  private async generateSummary(data: ProcessedReportData): Promise<void> {
    const template = await this.template.load('summary');
    const summary = template.render({ data });
    
    await this.fs.writeFile(
      `${this.config.outputDir}/summary.md`,
      summary
    );
  }

  private async loadHistoricalData(): Promise<HistoricalData[]> {
    try {
      const files = await this.fs.glob(
        `${this.config.outputDir}/report-*.json`
      );
      
      return Promise.all(
        files.map(async file => {
          const content = await this.fs.readFile(file, 'utf-8');
          return JSON.parse(content);
        })
      );
    } catch (error) {
      this.logger.warn('Failed to load historical data', error);
      return [];
    }
  }
} 
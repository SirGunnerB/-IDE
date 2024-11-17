interface TestReport {
  summary: TestSummary;
  suites: TestSuiteResult[];
  coverage?: CoverageReport;
  performance?: PerformanceReport;
  timestamp: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

export class TestReportingService {
  private reporters: Map<string, TestReporter> = new Map();
  private history: TestReport[] = [];
  private formatter: ReportFormatter;

  async generateReport(results: TestResult[], options: ReportOptions): Promise<TestReport> {
    const report: TestReport = {
      summary: this.generateSummary(results),
      suites: this.groupResultsBySuite(results),
      timestamp: Date.now()
    };

    // Add coverage data if available
    if (options.coverage) {
      report.coverage = await this.generateCoverageReport(results);
    }

    // Add performance data if available
    if (options.performance) {
      report.performance = await this.generatePerformanceReport(results);
    }

    // Store report in history
    this.history.push(report);

    // Generate reports in all configured formats
    await this.outputReport(report, options.formats);

    return report;
  }

  private async outputReport(report: TestReport, formats: ReportFormat[]): Promise<void> {
    for (const format of formats) {
      const reporter = this.reporters.get(format);
      if (!reporter) {
        throw new Error(`No reporter found for format: ${format}`);
      }

      try {
        await reporter.generate(report);
      } catch (error) {
        console.error(`Error generating ${format} report:`, error);
      }
    }
  }

  private generateSummary(results: TestResult[]): TestSummary {
    return {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      coverage: this.calculateOverallCoverage(results)
    };
  }

  private async generateCoverageReport(results: TestResult[]): Promise<CoverageReport> {
    const coverageData = await this.collectCoverageData(results);
    return {
      overall: this.calculateOverallCoverage(coverageData),
      byFile: this.calculateFileSpecificCoverage(coverageData),
      uncoveredLines: this.findUncoveredLines(coverageData)
    };
  }
} 
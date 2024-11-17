interface CoverageData {
  statements: CoverageEntry[];
  branches: CoverageEntry[];
  functions: CoverageEntry[];
  lines: CoverageEntry[];
}

interface CoverageEntry {
  id: string;
  start: Position;
  end: Position;
  count: number;
  covered: boolean;
}

export class TestCoverageService {
  private coverage: Map<string, CoverageData> = new Map();
  private instrumenter: CodeInstrumenter;
  private reporter: CoverageReporter;

  async instrumentCode(files: string[]): Promise<void> {
    for (const file of files) {
      const source = await fs.readFile(file, 'utf-8');
      const instrumented = await this.instrumenter.instrument(source, {
        filename: file,
        coverageVariable: '__coverage__'
      });

      await fs.writeFile(file, instrumented.code);
      this.coverage.set(file, this.initializeCoverage(instrumented.metadata));
    }
  }

  async generateReport(format: 'html' | 'lcov' | 'json'): Promise<void> {
    const report = await this.aggregateCoverage();
    
    // Generate detailed metrics
    const metrics = this.calculateMetrics(report);
    
    // Create coverage report
    await this.reporter.generate(report, metrics, format);
  }

  private calculateMetrics(coverage: CoverageData): CoverageMetrics {
    const metrics: CoverageMetrics = {
      total: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      },
      covered: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      }
    };

    // Calculate statement coverage
    coverage.statements.forEach(stmt => {
      metrics.total.statements++;
      if (stmt.covered) metrics.covered.statements++;
    });

    // Calculate branch coverage
    coverage.branches.forEach(branch => {
      metrics.total.branches++;
      if (branch.covered) metrics.covered.branches++;
    });

    // Calculate function coverage
    coverage.functions.forEach(func => {
      metrics.total.functions++;
      if (func.covered) metrics.covered.functions++;
    });

    // Calculate line coverage
    coverage.lines.forEach(line => {
      metrics.total.lines++;
      if (line.covered) metrics.covered.lines++;
    });

    return metrics;
  }
} 
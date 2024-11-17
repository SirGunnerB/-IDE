import { Logger } from '../../utils/Logger';
import { Performance } from '../../utils/Performance';
import { Statistics } from './Statistics';
import { Chart } from './Chart';
import { FileSystem } from '../../utils/FileSystem';

export class Benchmark {
  private readonly logger = new Logger('Benchmark');
  private readonly performance = new Performance();
  private readonly stats = new Statistics();
  private readonly fs = new FileSystem();
  private readonly results: BenchmarkResult[] = [];

  constructor(private readonly config: BenchmarkConfig) {}

  async measure<T>(
    name: string,
    fn: () => Promise<T> | T,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 1000,
      warmup = 100,
      gc = true,
      async = true
    } = options;

    this.logger.info(`Starting benchmark: ${name}`);

    // Warmup phase
    await this.warmup(fn, warmup, async);

    // Collection phase
    const samples: number[] = [];
    const memoryUsage: number[] = [];

    for (let i = 0; i < iterations; i++) {
      if (gc && global.gc) {
        global.gc();
      }

      const startMemory = process.memoryUsage().heapUsed;
      const duration = await this.measureIteration(fn, async);
      const endMemory = process.memoryUsage().heapUsed;

      samples.push(duration);
      memoryUsage.push(endMemory - startMemory);

      await this.delay(10); // Prevent CPU throttling
    }

    const result = {
      name,
      samples,
      memoryUsage,
      stats: {
        duration: this.stats.analyze(samples),
        memory: this.stats.analyze(memoryUsage)
      },
      timestamp: Date.now()
    };

    this.results.push(result);
    await this.saveResult(result);
    this.logResult(result);

    return result;
  }

  private async warmup<T>(
    fn: () => Promise<T> | T,
    iterations: number,
    async: boolean
  ): Promise<void> {
    this.logger.debug(`Warming up for ${iterations} iterations`);
    for (let i = 0; i < iterations; i++) {
      if (async) {
        await fn();
      } else {
        fn();
      }
    }
  }

  private async measureIteration<T>(
    fn: () => Promise<T> | T,
    async: boolean
  ): Promise<number> {
    const start = this.performance.start();
    if (async) {
      await fn();
    } else {
      fn();
    }
    return this.performance.end(start);
  }

  async compare(
    benchmarks: { name: string; fn: () => any }[],
    options?: BenchmarkOptions
  ): Promise<void> {
    const results = await Promise.all(
      benchmarks.map(b => this.measure(b.name, b.fn, options))
    );

    const chart = new Chart();
    await chart.generateComparison(results, {
      outputPath: `${this.config.outputDir}/comparison.png`
    });

    this.logComparison(results);
  }

  private async saveResult(result: BenchmarkResult): Promise<void> {
    await this.fs.ensureDir(this.config.outputDir);
    await this.fs.writeFile(
      `${this.config.outputDir}/${result.name}-${result.timestamp}.json`,
      JSON.stringify(result, null, 2)
    );
  }

  private logResult(result: BenchmarkResult): void {
    this.logger.info(`
Benchmark Results: ${result.name}
Duration:
  Mean: ${this.performance.formatDuration(result.stats.duration.mean)}
  P95:  ${this.performance.formatDuration(result.stats.duration.p95)}
  Min:  ${this.performance.formatDuration(result.stats.duration.min)}
  Max:  ${this.performance.formatDuration(result.stats.duration.max)}
Memory:
  Mean: ${formatBytes(result.stats.memory.mean)}
  P95:  ${formatBytes(result.stats.memory.p95)}
  Min:  ${formatBytes(result.stats.memory.min)}
  Max:  ${formatBytes(result.stats.memory.max)}
    `);
  }

  private logComparison(results: BenchmarkResult[]): void {
    const baseline = results[0];
    
    results.slice(1).forEach(result => {
      const durationDiff = this.calculateDifference(
        baseline.stats.duration.mean,
        result.stats.duration.mean
      );

      const memoryDiff = this.calculateDifference(
        baseline.stats.memory.mean,
        result.stats.memory.mean
      );

      this.logger.info(`
Comparison: ${baseline.name} vs ${result.name}
Duration: ${durationDiff > 0 ? 'slower' : 'faster'} by ${Math.abs(durationDiff)}%
Memory:   ${memoryDiff > 0 ? 'higher' : 'lower'} by ${Math.abs(memoryDiff)}%
      `);
    });
  }

  private calculateDifference(baseline: number, current: number): number {
    return ((current - baseline) / baseline) * 100;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
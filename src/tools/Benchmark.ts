import { Performance } from '../utils/Performance';
import { Logger } from '../utils/Logger';
import { Statistics } from './Statistics';

export class Benchmark {
  private readonly logger = new Logger('Benchmark');
  private readonly performance = new Performance();
  private readonly stats = new Statistics();
  private readonly results: BenchmarkResult[] = [];

  async run<T>(
    name: string,
    fn: () => Promise<T>,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmup = 10,
      timeout = 30000,
      gc = true
    } = options;

    this.logger.info(`Starting benchmark: ${name}`);
    
    // Warmup phase
    await this.warmup(fn, warmup);

    // Collection phase
    const samples: number[] = [];
    const memoryUsage: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      if (gc) global.gc?.();
      
      const startMemory = process.memoryUsage().heapUsed;
      const duration = await this.measure(fn);
      const endMemory = process.memoryUsage().heapUsed;
      
      samples.push(duration);
      memoryUsage.push(endMemory - startMemory);
      
      await this.delay(10); // Prevent CPU throttling
    }

    // Analysis
    const result = {
      name,
      samples,
      memoryUsage,
      stats: {
        duration: this.stats.analyze(samples),
        memory: this.stats.analyze(memoryUsage)
      }
    };

    this.results.push(result);
    this.logResults(result);

    return result;
  }

  private async warmup<T>(fn: () => Promise<T>, iterations: number): Promise<void> {
    this.logger.debug(`Warming up for ${iterations} iterations`);
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
  }

  private async measure<T>(fn: () => Promise<T>): Promise<number> {
    const start = this.performance.start();
    await fn();
    return this.performance.end(start);
  }

  private logResults(result: BenchmarkResult): void {
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  compareResults(baseline: string, contender: string): void {
    const baselineResult = this.results.find(r => r.name === baseline);
    const contenderResult = this.results.find(r => r.name === contender);

    if (!baselineResult || !contenderResult) {
      throw new Error('Benchmark results not found');
    }

    const durationDiff = this.calculateDifference(
      baselineResult.stats.duration.mean,
      contenderResult.stats.duration.mean
    );

    const memoryDiff = this.calculateDifference(
      baselineResult.stats.memory.mean,
      contenderResult.stats.memory.mean
    );

    this.logger.info(`
Comparison: ${baseline} vs ${contender}
Duration: ${durationDiff > 0 ? 'slower' : 'faster'} by ${Math.abs(durationDiff)}%
Memory:   ${memoryDiff > 0 ? 'higher' : 'lower'} by ${Math.abs(memoryDiff)}%
    `);
  }

  private calculateDifference(baseline: number, contender: number): number {
    return ((contender - baseline) / baseline) * 100;
  }
} 
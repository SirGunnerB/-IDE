interface PerformanceTest {
  name: string;
  iterations: number;
  warmup?: number;
  timeout?: number;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  test: () => Promise<void>;
}

interface PerformanceResult {
  name: string;
  samples: number[];
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
}

export class PerformanceTestingService {
  private tests: Map<string, PerformanceTest> = new Map();
  private results: Map<string, PerformanceResult> = new Map();

  async runPerformanceTest(test: PerformanceTest): Promise<PerformanceResult> {
    // Perform warmup iterations if specified
    if (test.warmup) {
      await this.runWarmup(test);
    }

    const samples: number[] = [];

    try {
      // Setup test environment
      await test.setup?.();

      // Run test iterations
      for (let i = 0; i < test.iterations; i++) {
        const duration = await this.measureIteration(test);
        samples.push(duration);
      }

      // Calculate statistics
      const result = this.calculateStatistics(test.name, samples);
      this.results.set(test.name, result);

      return result;
    } finally {
      // Cleanup test environment
      await test.teardown?.();
    }
  }

  private async measureIteration(test: PerformanceTest): Promise<number> {
    const start = performance.now();
    
    try {
      await Promise.race([
        test.test(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), test.timeout || 5000)
        )
      ]);
    } catch (error) {
      throw new Error(`Performance test failed: ${error.message}`);
    }

    return performance.now() - start;
  }

  private calculateStatistics(name: string, samples: number[]): PerformanceResult {
    const sorted = [...samples].sort((a, b) => a - b);
    
    return {
      name,
      samples,
      mean: this.calculateMean(samples),
      median: this.calculateMedian(sorted),
      stdDev: this.calculateStdDev(samples),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentiles: {
        p95: this.calculatePercentile(sorted, 95),
        p99: this.calculatePercentile(sorted, 99)
      }
    };
  }
} 
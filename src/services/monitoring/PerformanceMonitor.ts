import { PerformanceMetrics, TestMetrics } from '../../types';
import { Logger } from '../../utils/Logger';

export class PerformanceMonitor {
  private readonly logger: Logger;
  private readonly metrics: Map<string, TestMetrics> = new Map();
  private readonly startTimes: Map<string, number> = new Map();

  constructor() {
    this.logger = new Logger('PerformanceMonitor');
  }

  startTest(testId: string): void {
    const startTime = performance.now();
    this.startTimes.set(testId, startTime);
    
    // Initialize metrics
    this.metrics.set(testId, {
      testId,
      startTime,
      memoryUsage: [],
      cpuUsage: [],
      gcCollections: 0
    });

    // Start collecting metrics
    this.startCollecting(testId);
  }

  endTest(testId: string): TestMetrics {
    const endTime = performance.now();
    const metrics = this.metrics.get(testId);
    
    if (!metrics) {
      throw new Error(`No metrics found for test: ${testId}`);
    }

    // Stop collecting metrics
    this.stopCollecting(testId);

    // Calculate final metrics
    const duration = endTime - (this.startTimes.get(testId) ?? endTime);
    const finalMetrics = this.calculateFinalMetrics(metrics, duration);

    // Cleanup
    this.startTimes.delete(testId);
    this.metrics.delete(testId);

    return finalMetrics;
  }

  private startCollecting(testId: string): void {
    const intervalId = setInterval(() => {
      const metrics = this.metrics.get(testId);
      if (!metrics) return;

      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      metrics.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      });

      metrics.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });

    }, 100); // Collect metrics every 100ms

    // Store interval ID for cleanup
    metrics.get(testId)!.intervalId = intervalId;
  }

  private stopCollecting(testId: string): void {
    const metrics = this.metrics.get(testId);
    if (metrics?.intervalId) {
      clearInterval(metrics.intervalId);
    }
  }

  private calculateFinalMetrics(metrics: TestMetrics, duration: number): TestMetrics {
    const memoryUsage = metrics.memoryUsage;
    const cpuUsage = metrics.cpuUsage;

    return {
      ...metrics,
      duration,
      averageMemoryUsage: this.calculateAverageMemory(memoryUsage),
      peakMemoryUsage: this.calculatePeakMemory(memoryUsage),
      averageCpuUsage: this.calculateAverageCpu(cpuUsage),
      peakCpuUsage: this.calculatePeakCpu(cpuUsage)
    };
  }

  private calculateAverageMemory(samples: PerformanceMetrics[]): number {
    if (samples.length === 0) return 0;
    const sum = samples.reduce((acc, sample) => acc + sample.heapUsed, 0);
    return sum / samples.length;
  }

  private calculatePeakMemory(samples: PerformanceMetrics[]): number {
    if (samples.length === 0) return 0;
    return Math.max(...samples.map(sample => sample.heapUsed));
  }

  private calculateAverageCpu(samples: any[]): number {
    if (samples.length === 0) return 0;
    const sum = samples.reduce((acc, sample) => acc + sample.user + sample.system, 0);
    return sum / samples.length;
  }

  private calculatePeakCpu(samples: any[]): number {
    if (samples.length === 0) return 0;
    return Math.max(...samples.map(sample => sample.user + sample.system));
  }
} 
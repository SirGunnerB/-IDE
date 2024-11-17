import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { Performance } from '../utils/Performance';
import { Metrics, MetricSnapshot, PerformanceAlert } from '../types';

export class PerformanceMonitor extends EventEmitter {
  private readonly logger = new Logger('PerformanceMonitor');
  private readonly performance = new Performance();
  private readonly metrics: Map<string, Metrics> = new Map();
  private readonly thresholds: Map<string, number> = new Map();
  private intervalId?: NodeJS.Timeout;

  constructor(private readonly config: MonitorConfig) {
    super();
    this.setupThresholds();
  }

  start(): void {
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.interval || 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private setupThresholds(): void {
    this.thresholds.set('heapUsed', this.config.maxHeapUsed || 1024 * 1024 * 1024); // 1GB
    this.thresholds.set('cpuUsage', this.config.maxCpuUsage || 80); // 80%
    this.thresholds.set('eventLoopDelay', this.config.maxEventLoopDelay || 100); // 100ms
  }

  private async collectMetrics(): Promise<void> {
    const snapshot = await this.takeSnapshot();
    this.storeMetrics(snapshot);
    this.checkThresholds(snapshot);
  }

  private async takeSnapshot(): Promise<MetricSnapshot> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const eventLoopDelay = await this.measureEventLoopDelay();

    return {
      timestamp: Date.now(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      eventLoop: {
        delay: eventLoopDelay
      }
    };
  }

  private async measureEventLoopDelay(): Promise<number> {
    const start = this.performance.start();
    return new Promise(resolve => {
      setImmediate(() => {
        resolve(this.performance.end(start));
      });
    });
  }

  private storeMetrics(snapshot: MetricSnapshot): void {
    const key = Math.floor(snapshot.timestamp / (this.config.aggregationPeriod || 60000));
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        snapshots: [],
        aggregates: null
      });
    }

    const metrics = this.metrics.get(key)!;
    metrics.snapshots.push(snapshot);

    if (metrics.snapshots.length >= this.config.maxSnapshots) {
      this.aggregateMetrics(key);
    }
  }

  private aggregateMetrics(key: string): void {
    const metrics = this.metrics.get(key)!;
    const snapshots = metrics.snapshots;

    metrics.aggregates = {
      period: key,
      memory: this.calculateStats(snapshots.map(s => s.memory.heapUsed)),
      cpu: this.calculateStats(snapshots.map(s => s.cpu.user + s.cpu.system)),
      eventLoop: this.calculateStats(snapshots.map(s => s.eventLoop.delay))
    };

    metrics.snapshots = [];
    this.emit('metrics', metrics.aggregates);
  }

  private calculateStats(values: number[]): MetricStats {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b) / values.length,
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }

  private checkThresholds(snapshot: MetricSnapshot): void {
    for (const [metric, threshold] of this.thresholds) {
      const value = this.getMetricValue(snapshot, metric);
      if (value > threshold) {
        const alert: PerformanceAlert = {
          metric,
          value,
          threshold,
          timestamp: snapshot.timestamp
        };
        this.emit('alert', alert);
        this.logger.warn(`Performance threshold exceeded: ${metric}
      }
    }
  }

  private getMetricValue(snapshot: MetricSnapshot, metric: string): number {
    switch (metric) {
      case 'heapUsed':
        return snapshot.memory.heapUsed;
      case 'cpuUsage':
        return snapshot.cpu.user + snapshot.cpu.system;
      case 'eventLoopDelay':
        return snapshot.eventLoop.delay;
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }
  }
} 
import { Test, TestResult, Worker } from '../types';
import { WorkerPool } from './WorkerPool';
import { ResultCache } from './ResultCache';
import { MetricsCollector } from './MetricsCollector';

export class TestRunner {
  private readonly workerPool: WorkerPool;
  private readonly resultCache: ResultCache;
  private readonly metrics: MetricsCollector;

  constructor(options: {
    maxWorkers: number;
    timeout: number;
  }) {
    this.workerPool = new WorkerPool(options);
    this.resultCache = new ResultCache();
    this.metrics = new MetricsCollector();
  }

  async runTest(test: Test): Promise<TestResult> {
    const startTime = performance.now();
    let worker: Worker | null = null;
    let result: TestResult;

    try {
      // Check cache
      const cachedResult = this.resultCache.get(test.id);
      if (cachedResult) {
        return cachedResult;
      }

      // Get worker
      worker = await this.workerPool.acquire();
      if (!worker) {
        throw new Error('No workers available');
      }

      // Execute test
      result = await this.executeTest(worker, test);

      // Cache result
      this.resultCache.set(test.id, result);

      // Record metrics
      this.metrics.recordTest({
        testId: test.id,
        duration: performance.now() - startTime,
        status: result.status
      });

      return result;

    } catch (error) {
      result = {
        id: test.id,
        status: 'failed',
        duration: performance.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error))
      };
      throw result;

    } finally {
      if (worker) {
        await this.workerPool.release(worker);
      }
    }
  }

  private async executeTest(worker: Worker, test: Test): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Test timeout after ${test.timeout || 5000}ms`));
      }, test.timeout || 5000);

      worker.execute(test)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  async cleanup(): Promise<void> {
    await this.workerPool.cleanup();
    this.resultCache.clear();
  }
} 
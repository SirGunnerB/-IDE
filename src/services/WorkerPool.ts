import { Worker } from '../types';

export class WorkerPool {
  private workers: Worker[] = [];
  private readonly maxWorkers: number;

  constructor(options: { maxWorkers: number }) {
    this.maxWorkers = options.maxWorkers;
  }

  async acquire(): Promise<Worker> {
    // Find available worker
    let worker = this.workers.find(w => !w.busy);

    // Create new worker if needed and possible
    if (!worker && this.workers.length < this.maxWorkers) {
      worker = await this.createWorker();
      this.workers.push(worker);
    }

    // Wait for available worker
    if (!worker) {
      worker = await this.waitForAvailableWorker();
    }

    worker.busy = true;
    return worker;
  }

  async release(worker: Worker): Promise<void> {
    const index = this.workers.findIndex(w => w.id === worker.id);
    if (index !== -1) {
      this.workers[index].busy = false;
    }
  }

  private async createWorker(): Promise<Worker> {
    const id = crypto.randomUUID();
    return {
      id,
      busy: false,
      execute: async (test) => {
        // Worker implementation
        return {
          id: test.id,
          status: 'passed',
          duration: 0
        };
      }
    };
  }

  private async waitForAvailableWorker(): Promise<Worker> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const worker = this.workers.find(w => !w.busy);
        if (worker) {
          clearInterval(interval);
          resolve(worker);
        }
      }, 100);
    });
  }

  async cleanup(): Promise<void> {
    this.workers = [];
  }
} 
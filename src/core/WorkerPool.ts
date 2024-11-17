import { Worker, WorkerStatus } from '../types';
import { Logger } from '../utils/Logger';
import { EventEmitter } from 'events';

export class WorkerPool extends EventEmitter {
  private workers: Map<string, Worker> = new Map();
  private queue: Array<{ resolve: (worker: Worker) => void }> = [];
  private readonly logger: Logger;

  constructor(private readonly maxWorkers: number) {
    super();
    this.logger = new Logger('WorkerPool');
  }

  async acquire(): Promise<Worker> {
    // Find available worker
    const availableWorker = this.findAvailableWorker();
    if (availableWorker) {
      availableWorker.status = 'busy';
      return availableWorker;
    }

    // Create new worker if possible
    if (this.workers.size < this.maxWorkers) {
      const worker = await this.createWorker();
      this.workers.set(worker.id, worker);
      worker.status = 'busy';
      return worker;
    }

    // Wait for available worker
    return new Promise<Worker>(resolve => {
      this.queue.push({ resolve });
    });
  }

  async release(worker: Worker): Promise<void> {
    worker.status = 'idle';
    
    // Handle queued requests
    const queued = this.queue.shift();
    if (queued) {
      worker.status = 'busy';
      queued.resolve(worker);
    }
  }

  private findAvailableWorker(): Worker | undefined {
    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        return worker;
      }
    }
  }

  private async createWorker(): Promise<Worker> {
    const id = crypto.randomUUID();
    
    const worker = {
      id,
      status: 'idle' as WorkerStatus,
      execute: async (test) => {
        // Worker implementation
        return test.fn();
      }
    };

    this.emit('workerCreated', worker);
    return worker;
  }

  async cleanup(): Promise<void> {
    this.workers.clear();
    this.queue = [];
    this.emit('cleanup');
  }
} 
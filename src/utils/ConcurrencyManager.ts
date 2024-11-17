export class ConcurrencyManager {
  private readonly semaphore: Semaphore;
  private readonly taskQueue: PriorityQueue<Task>;

  constructor(maxConcurrent: number) {
    this.semaphore = new Semaphore(maxConcurrent);
    this.taskQueue = new PriorityQueue();
  }

  async execute<T>(
    task: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    await this.semaphore.acquire();

    try {
      return await task();
    } finally {
      this.semaphore.release();
    }
  }

  async scheduleTask<T>(
    task: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.enqueue(
        {
          task,
          priority,
          resolve,
          reject
        },
        priority
      );
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.taskQueue.isEmpty()) return;

    const task = this.taskQueue.dequeue();
    if (!task) return;

    try {
      const result = await this.execute(task.task, task.priority);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    }
  }
} 
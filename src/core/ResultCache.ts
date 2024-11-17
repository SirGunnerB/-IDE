import { TestResult } from '../types';
import { Logger } from '../utils/Logger';
import { LRUCache } from '../utils/LRUCache';

export class ResultCache {
  private readonly cache: LRUCache<TestResult>;
  private readonly logger: Logger;

  constructor(maxSize: number = 1000) {
    this.cache = new LRUCache<TestResult>(maxSize);
    this.logger = new Logger('ResultCache');
  }

  async get(testId: string): Promise<TestResult | null> {
    const result = this.cache.get(testId);
    if (result) {
      this.logger.debug(`Cache hit: ${testId}`);
      return result;
    }
    return null;
  }

  async set(testId: string, result: TestResult): Promise<void> {
    this.cache.set(testId, result);
    this.logger.debug(`Cache set: ${testId}`);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  getStats(): { size: number; hits: number; misses: number } {
    return this.cache.getStats();
  }
} 
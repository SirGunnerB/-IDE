import { Logger } from './Logger';
import { Performance } from './Performance';
import * as util from 'util';
import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export class Debug {
  private static instance: Debug;
  private readonly logger: Logger;
  private readonly performance: Performance;
  private traceStream: WriteStream | null = null;
  private snapshots: Map<string, any> = new Map();

  private constructor() {
    this.logger = new Logger('Debug');
    this.performance = new Performance();
  }

  static getInstance(): Debug {
    if (!Debug.instance) {
      Debug.instance = new Debug();
    }
    return Debug.instance;
  }

  enableTracing(outputPath: string): void {
    this.traceStream = createWriteStream(
      join(outputPath, `trace-${Date.now()}.log`),
      { flags: 'a' }
    );
  }

  trace(message: string, data?: any): void {
    if (!this.traceStream) return;

    const timestamp = new Date().toISOString();
    const trace = new Error().stack?.split('\n')[2] || 'unknown';
    
    this.traceStream.write(`
[${timestamp}] ${message}
Location: ${trace}
${data ? `Data: ${util.inspect(data, { depth: null, colors: true })}` : ''}
-------------------
`);
  }

  takeSnapshot(name: string, value: any): void {
    this.snapshots.set(name, this.cloneDeep(value));
    this.logger.debug(`Snapshot taken: ${name}`);
  }

  compareSnapshots(name1: string, name2: string): void {
    const snapshot1 = this.snapshots.get(name1);
    const snapshot2 = this.snapshots.get(name2);

    if (!snapshot1 || !snapshot2) {
      throw new Error('Snapshot not found');
    }

    const diff = this.deepDiff(snapshot1, snapshot2);
    this.logger.info(`
Snapshot Comparison: ${name1} vs ${name2}
${util.inspect(diff, { depth: null, colors: true })}
    `);
  }

  private deepDiff(obj1: any, obj2: any): any {
    if (obj1 === obj2) return undefined;
    
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      return { from: obj1, to: obj2 };
    }

    const diff: any = {};

    for (const key in obj1) {
      if (!(key in obj2)) {
        diff[key] = { removed: obj1[key] };
        continue;
      }

      const valueDiff = this.deepDiff(obj1[key], obj2[key]);
      if (valueDiff) diff[key] = valueDiff;
    }

    for (const key in obj2) {
      if (!(key in obj1)) {
        diff[key] = { added: obj2[key] };
      }
    }

    return Object.keys(diff).length ? diff : undefined;
  }

  private cloneDeep<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  async measureMemory(fn: () => Promise<void>): Promise<MemoryProfile> {
    if (global.gc) global.gc();
    
    const before = process.memoryUsage();
    await fn();
    if (global.gc) global.gc();
    const after = process.memoryUsage();

    return {
      heapUsed: after.heapUsed - before.heapUsed,
      heapTotal: after.heapTotal - before.heapTotal,
      external: after.external - before.external,
      rss: after.rss - before.rss
    };
  }

  async profile<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number; memory: MemoryProfile }> {
    const start = this.performance.start();
    const memoryProfile = await this.measureMemory(async () => {
      const result = await fn();
      return result;
    });
    const duration = this.performance.end(start);

    this.logger.debug(`
Profile: ${name}
Duration: ${this.performance.formatDuration(duration)}
Memory:
  Heap Used:  ${formatBytes(memoryProfile.heapUsed)}
  Heap Total: ${formatBytes(memoryProfile.heapTotal)}
  External:   ${formatBytes(memoryProfile.external)}
  RSS:        ${formatBytes(memoryProfile.rss)}
    `);

    return { result: await fn(), duration, memory: memoryProfile };
  }

  cleanup(): void {
    this.traceStream?.end();
    this.snapshots.clear();
  }
}

interface MemoryProfile {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Math.abs(bytes);
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(2)} ${units[unit]}`;
} 
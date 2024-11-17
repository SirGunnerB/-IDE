import { Logger } from '../../utils/Logger';
import { Performance } from '../../utils/Performance';
import { FileSystem } from '../../utils/FileSystem';
import * as util from 'util';
import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export class Debugger {
  private static instance: Debugger;
  private readonly logger: Logger;
  private readonly performance: Performance;
  private readonly fs: FileSystem;
  private traceStream: WriteStream | null = null;
  private snapshots: Map<string, any> = new Map();
  private breakpoints: Set<string> = new Set();
  private watchers: Map<string, WatchCallback> = new Map();

  private constructor(private readonly config: DebugConfig) {
    this.logger = new Logger('Debugger');
    this.performance = new Performance();
    this.fs = new FileSystem();
    this.setupDebugger();
  }

  static getInstance(config?: DebugConfig): Debugger {
    if (!Debugger.instance) {
      Debugger.instance = new Debugger(config || {});
    }
    return Debugger.instance;
  }

  private setupDebugger(): void {
    if (this.config.traceFile) {
      this.enableTracing(this.config.traceFile);
    }

    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
  }

  enableTracing(outputPath: string): void {
    this.traceStream = createWriteStream(
      join(outputPath, `debug-${Date.now()}.log`),
      { flags: 'a' }
    );
  }

  trace(message: string, data?: any): void {
    if (!this.traceStream) return;

    const timestamp = new Date().toISOString();
    const stack = new Error().stack?.split('\n')[2] || 'unknown';
    
    this.traceStream.write(`
[${timestamp}] ${message}
Location: ${stack}
${data ? `Data: ${util.inspect(data, { depth: null, colors: true })}` : ''}
-------------------
`);
  }

  setBreakpoint(location: string, condition?: string): void {
    this.breakpoints.add(JSON.stringify({ location, condition }));
  }

  watch(expression: string, callback: WatchCallback): void {
    this.watchers.set(expression, callback);
  }

  async takeSnapshot(name: string): Promise<void> {
    const snapshot = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      handles: process._getActiveHandles().length,
      requests: process._getActiveRequests().length,
      custom: await this.collectCustomMetrics()
    };

    this.snapshots.set(name, snapshot);
    this.logger.debug(`Snapshot taken: ${name}`);
  }

  compareSnapshots(name1: string, name2: string): void {
    const snapshot1 = this.snapshots.get(name1);
    const snapshot2 = this.snapshots.get(name2);

    if (!snapshot1 || !snapshot2) {
      throw new Error('Snapshot not found');
    }

    const diff = this.calculateSnapshotDiff(snapshot1, snapshot2);
    this.logger.info(`
Snapshot Comparison: ${name1} vs ${name2}
${util.inspect(diff, { depth: null, colors: true })}
    `);
  }

  async inspect(value: any, options: InspectOptions = {}): Promise<void> {
    const {
      depth = null,
      showHidden = false,
      colors = true,
      showProxy = true
    } = options;

    const output = util.inspect(value, {
      depth,
      showHidden,
      colors,
      showProxy
    });

    if (this.config.logToFile) {
      await this.fs.appendFile(
        this.config.logFile!,
        `${new Date().toISOString()} - Inspection:\n${output}\n\n`
      );
    }

    console.log(output);
  }

  private handleUncaughtException(error: Error): void {
    this.logger.error('Uncaught Exception:', error);
    this.trace('Uncaught Exception', error);
    this.takeSnapshot(`exception-${Date.now()}`);
  }

  private handleUnhandledRejection(reason: any): void {
    this.logger.error('Unhandled Rejection:', reason);
    this.trace('Unhandled Rejection', reason);
    this.takeSnapshot(`rejection-${Date.now()}`);
  }

  private async collectCustomMetrics(): Promise<Record<string, any>> {
    // Implement custom metrics collection
    return {};
  }

  private calculateSnapshotDiff(
    snapshot1: any,
    snapshot2: any
  ): Record<string, any> {
    // Implement snapshot difference calculation
    return {};
  }

  cleanup(): void {
    this.traceStream?.end();
    this.snapshots.clear();
    this.breakpoints.clear();
    this.watchers.clear();
  }
}

type WatchCallback = (newValue: any, oldValue: any) => void;

interface InspectOptions {
  depth?: number | null;
  showHidden?: boolean;
  colors?: boolean;
  showProxy?: boolean;
}

// Export singleton instance
export const debug = Debugger.getInstance(); 
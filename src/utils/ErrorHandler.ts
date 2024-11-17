import { Logger } from './Logger';
import { Performance } from './Performance';
import { ErrorReport, ErrorContext, ErrorMetadata } from '../types';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private readonly logger: Logger;
  private readonly performance: Performance;
  private readonly errors: Map<string, ErrorReport> = new Map();

  private constructor() {
    this.logger = new Logger('ErrorHandler');
    this.performance = new Performance();
    this.setupGlobalHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalHandlers(): void {
    process.on('uncaughtException', (error: Error) => {
      this.handleError(error, { source: 'uncaughtException' });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: any) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.handleError(error, { source: 'unhandledRejection' });
    });
  }

  handleError(error: Error, context: ErrorContext = {}): ErrorReport {
    const report = this.createErrorReport(error, context);
    this.errors.set(report.id, report);
    
    this.logger.error(
      `Error [${report.id}]: ${error.message}`,
      error,
      context
    );

    return report;
  }

  private createErrorReport(error: Error, context: ErrorContext): ErrorReport {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      },
      context: {
        ...context,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform
      },
      metadata: this.collectMetadata()
    };
  }

  private collectMetadata(): ErrorMetadata {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    return {
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss
      },
      cpu: {
        user: cpu.user,
        system: cpu.system
      },
      uptime: process.uptime(),
      pid: process.pid
    };
  }

  async getErrorReport(id: string): Promise<ErrorReport | undefined> {
    return this.errors.get(id);
  }

  async getAllErrors(): Promise<ErrorReport[]> {
    return Array.from(this.errors.values());
  }

  async clearErrors(): Promise<void> {
    this.errors.clear();
  }
}

// Custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly query?: string,
    public readonly params?: any[]
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
} 
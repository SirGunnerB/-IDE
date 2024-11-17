import chalk from 'chalk';
import { format } from 'date-fns';
import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

interface LoggerOptions {
  level?: LogLevel;
  filename?: string;
  console?: boolean;
  colors?: boolean;
  timestamp?: boolean;
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;
  private static fileStream: WriteStream | null = null;
  private static instances: Map<string, Logger> = new Map();

  private readonly context: string;
  private readonly options: Required<LoggerOptions>;

  static configure(options: LoggerOptions): void {
    if (options.level !== undefined) {
      Logger.level = options.level;
    }

    if (options.filename) {
      Logger.fileStream?.end();
      Logger.fileStream = createWriteStream(options.filename, { flags: 'a' });
    }
  }

  static getInstance(context: string, options: LoggerOptions = {}): Logger {
    const existing = Logger.instances.get(context);
    if (existing) return existing;

    const logger = new Logger(context, options);
    Logger.instances.set(context, logger);
    return logger;
  }

  private constructor(context: string, options: LoggerOptions) {
    this.context = context;
    this.options = {
      level: options.level ?? Logger.level,
      filename: options.filename,
      console: options.console ?? true,
      colors: options.colors ?? true,
      timestamp: options.timestamp ?? true
    };
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, args);
  }

  error(message: string, error?: Error, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, [...args, error?.stack || error]);
  }

  private log(level: LogLevel, message: string, args: any[]): void {
    if (level < this.options.level) return;

    const timestamp = this.options.timestamp 
      ? `[${format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')}] `
      : '';
    
    const levelStr = LogLevel[level].padEnd(5);
    const contextStr = `[${this.context}]`.padEnd(15);
    const formattedArgs = args.length ? '\n' + this.formatArgs(args) : '';
    
    const logMessage = `${timestamp}${levelStr} ${contextStr} ${message}${formattedArgs}`;

    if (this.options.console) {
      this.writeToConsole(level, logMessage);
    }

    if (Logger.fileStream) {
      Logger.fileStream.write(logMessage + '\n');
    }
  }

  private writeToConsole(level: LogLevel, message: string): void {
    const colorize = this.options.colors ? this.getColorizer(level) : (x: string) => x;
    console.log(colorize(message));
  }

  private getColorizer(level: LogLevel): (message: string) => string {
    switch (level) {
      case LogLevel.DEBUG:
        return chalk.blue;
      case LogLevel.INFO:
        return chalk.green;
      case LogLevel.WARN:
        return chalk.yellow;
      case LogLevel.ERROR:
        return chalk.red;
      default:
        return (message: string) => message;
    }
  }

  private formatArgs(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg);
      } else if (typeof arg === 'string') {
        return arg;
      } else {
        return '';
      }
    }).join(' ');
  }
} 
enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: any;
  stackTrace?: string;
}

export class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private logFile: string;

  constructor() {
    this.logFile = path.join(process.env.APPDATA!, 'ai-editor', 'logs', 'editor.log');
  }

  async log(level: LogLevel, message: string, context?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      stackTrace: new Error().stack
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    await this.writeToFile(entry);
  }

  private async writeToFile(entry: LogEntry) {
    const formattedLog = `[${entry.timestamp.toISOString()}] ${LogLevel[entry.level]}: ${entry.message}\n`;
    await fs.appendFile(this.logFile, formattedLog);
  }

  async getRecentLogs(count: number = 100): Promise<LogEntry[]> {
    return this.logs.slice(-count);
  }
} 
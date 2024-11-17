interface ErrorEvent {
  id: string;
  timestamp: number;
  type: string;
  message: string;
  stack?: string;
  metadata: Record<string, any>;
}

interface ErrorAnalytics {
  frequency: Record<string, number>;
  impact: Record<string, number>;
  trends: ErrorTrend[];
}

export class ErrorTrackingService {
  private errors: ErrorEvent[] = [];
  private handlers: ErrorHandler[] = [];
  private analytics: ErrorAnalytics;

  initialize(): void {
    this.setupGlobalHandlers();
    this.startErrorAnalysis();
    this.initializeAnalytics();
  }

  private setupGlobalHandlers(): void {
    window.onerror = (message, source, line, column, error) => {
      this.trackError({
        type: 'uncaught',
        message: message.toString(),
        stack: error?.stack,
        metadata: {
          source,
          line,
          column
        }
      });
    };

    window.onunhandledrejection = (event) => {
      this.trackError({
        type: 'unhandledRejection',
        message: event.reason?.message || 'Unhandled Promise rejection',
        stack: event.reason?.stack,
        metadata: {
          promise: event.promise
        }
      });
    };
  }

  async trackError(error: Omit<ErrorEvent, 'id' | 'timestamp'>): Promise<void> {
    const errorEvent: ErrorEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...error
    };

    this.errors.push(errorEvent);
    await this.persistError(errorEvent);
    await this.notifyError(errorEvent);
    await this.updateAnalytics(errorEvent);
  }

  private async analyzeErrors(): Promise<ErrorAnalysis> {
    const analysis: ErrorAnalysis = {
      patterns: this.detectErrorPatterns(),
      impact: this.calculateErrorImpact(),
      suggestions: await this.generateErrorSuggestions()
    };

    return analysis;
  }
} 
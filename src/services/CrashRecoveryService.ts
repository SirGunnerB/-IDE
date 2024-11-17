interface CrashReport {
  id: string;
  timestamp: Date;
  error: Error;
  context: {
    openFiles: string[];
    unsavedChanges: Record<string, string>;
    memoryUsage: number;
    stackTrace: string;
  };
}

export class CrashRecoveryService {
  private backupInterval: NodeJS.Timer | null = null;
  private crashReports: CrashReport[] = [];

  initialize() {
    this.setupErrorHandlers();
    this.startPeriodicBackup();
    this.loadPreviousCrashReports();
  }

  private setupErrorHandlers() {
    process.on('uncaughtException', (error) => {
      this.handleCrash(error);
    });

    process.on('unhandledRejection', (error) => {
      this.handleCrash(error as Error);
    });
  }

  private async handleCrash(error: Error) {
    const report = await this.generateCrashReport(error);
    await this.saveCrashReport(report);
    await this.backupUnsavedWork();
    
    // Attempt graceful shutdown
    this.shutdown();
  }

  async recoverFromCrash(reportId: string) {
    const report = await this.loadCrashReport(reportId);
    if (!report) return;

    // Restore unsaved changes
    for (const [file, content] of Object.entries(report.context.unsavedChanges)) {
      await this.restoreFile(file, content);
    }

    // Reopen files
    await this.reopenFiles(report.context.openFiles);
  }
} 
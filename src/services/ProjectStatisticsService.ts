interface ProjectStats {
  codebase: CodebaseStats;
  git: GitStats;
  performance: PerformanceStats;
  quality: QualityStats;
}

interface CodebaseStats {
  totalFiles: number;
  totalLines: number;
  languageDistribution: Record<string, number>;
  complexity: {
    average: number;
    highest: { file: string; value: number };
  };
}

export class ProjectStatisticsService {
  private stats: ProjectStats | null = null;
  private collectors: StatisticsCollector[] = [];
  private cache: StatisticsCache;

  async collectStatistics(): Promise<ProjectStats> {
    const stats: ProjectStats = {
      codebase: await this.analyzeCodebase(),
      git: await this.analyzeGitHistory(),
      performance: await this.analyzePerformance(),
      quality: await this.analyzeCodeQuality()
    };

    this.stats = stats;
    await this.cache.set('project-stats', stats);
    
    return stats;
  }

  async generateReport(format: 'html' | 'markdown' | 'pdf'): Promise<string> {
    const stats = this.stats || await this.collectStatistics();
    const report = await this.formatReport(stats, format);
    
    await this.saveReport(report, format);
    return report;
  }

  private async analyzeCodebase(): Promise<CodebaseStats> {
    const files = await this.getProjectFiles();
    let totalLines = 0;
    const languageDistribution: Record<string, number> = {};

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const language = this.detectLanguage(file);
      const lines = content.split('\n').length;

      totalLines += lines;
      languageDistribution[language] = (languageDistribution[language] || 0) + lines;
    }

    return {
      totalFiles: files.length,
      totalLines,
      languageDistribution,
      complexity: await this.calculateComplexity(files)
    };
  }
} 
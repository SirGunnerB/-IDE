export class Performance {
  private readonly marks: Map<string, number> = new Map();
  private readonly measures: Map<string, number[]> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark: string): number {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);

    if (!start || !end) {
      throw new Error(`Missing marks for measure: ${name}`);
    }

    const duration = end - start;
    const measures = this.measures.get(name) || [];
    measures.push(duration);
    this.measures.set(name, measures);

    return duration;
  }

  getStats(name: string): PerformanceStats {
    const measures = this.measures.get(name) || [];
    if (measures.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        p95: 0,
        count: 0
      };
    }

    measures.sort((a, b) => a - b);
    const p95Index = Math.floor(measures.length * 0.95);

    return {
      min: measures[0],
      max: measures[measures.length - 1],
      avg: measures.reduce((a, b) => a + b) / measures.length,
      p95: measures[p95Index],
      count: measures.length
    };
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  reset(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

interface PerformanceStats {
  min: number;
  max: number;
  avg: number;
  p95: number;
  count: number;
} 
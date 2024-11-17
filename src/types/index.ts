// Core Types
export interface Test {
  id: string;
  name: string;
  fn: () => Promise<void>;
  skip?: boolean;
  only?: boolean;
  tags?: string[];
  timeout?: number;
  retries?: number;
}

export interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  duration: number;
  startTime: number;
  endTime: number;
  error?: Error;
  retries?: number;
  metrics?: TestMetrics;
}

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'running';

export interface TestMetrics {
  testId: string;
  startTime: number;
  duration?: number;
  memoryUsage: MemoryMetric[];
  cpuUsage: CpuMetric[];
  gcCollections: number;
  intervalId?: NodeJS.Timeout;
}

export interface MemoryMetric {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export interface CpuMetric {
  timestamp: number;
  user: number;
  system: number;
}

export interface TestConfig {
  maxWorkers: number;
  timeout?: number;
  retries?: number;
  bail?: boolean;
  verbose?: boolean;
}

export interface ReportConfig {
  outputDir: string;
  formats: ReportFormat[];
  title?: string;
  includeMetrics?: boolean;
}

export type ReportFormat = 'json' | 'html' | 'markdown' | 'console';

// Worker Types
export interface Worker {
  id: string;
  busy: boolean;
  execute: (test: Test) => Promise<TestResult>;
}

// Resource Types
export interface Resource {
  id: string;
  cleanup: () => Promise<void>;
}

// Queue Types
export interface Task {
  id: string;
  priority: number;
  execute: () => Promise<any>;
} 
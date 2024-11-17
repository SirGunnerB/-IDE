export interface TestSuiteConfig {
  // Test execution
  maxWorkers: number;
  timeout: number;
  retries: number;
  bail: boolean;
  
  // Reporting
  reporters: ReporterConfig[];
  outputDir: string;
  
  // Test discovery
  testMatch: string[];
  testIgnore: string[];
  
  // Environment
  env: Record<string, string>;
  setupFiles: string[];
  teardownFiles: string[];
  
  // Features
  cache: boolean;
  parallel: boolean;
  watch: boolean;
  verbose: boolean;
}

export interface ReporterConfig {
  name: string;
  options?: Record<string, any>;
} 
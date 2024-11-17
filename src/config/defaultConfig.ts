import * as os from 'os';

export const defaultConfig = {
  maxWorkers: Math.max(1, Math.floor(os.cpus().length * 0.75)),
  timeout: 5000,
  retries: 0,
  bail: false,
  
  reporting: {
    outputDir: './test-results',
    coverageDir: './coverage',
    logsDir: './logs',
    formats: ['html', 'json'],
    includeMetrics: true,
    screenshots: true,
    video: false
  },

  environment: {
    NODE_ENV: 'test',
    TZ: 'UTC'
  },

  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],

  cache: true,
  parallel: true,
  watch: false,
  verbose: false,
  
  setup: {
    files: [],
    timeout: 30000
  },
  
  teardown: {
    files: [],
    timeout: 30000
  }
} as const;

export type DefaultConfig = typeof defaultConfig; 
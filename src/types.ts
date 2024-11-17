/// <reference lib="dom" />

import { Performance } from './utils/Performance';

export interface TestResult {
  name: string;
  passed: boolean;
}

export interface Test {
  id: string;
  name: string;
  filePath: string;
  fn: () => Promise<void>;
  suite: TestSuite;
}

export interface Logger {
  log: (message: string) => void;
  error: (message: string) => void;
}

export interface TestContext {
  performance: Performance;
  logger: Logger;
}

export interface TestSuite {
  name: string;
  tests: (Test | TestSuite)[];
  beforeAll: (() => Promise<void> | void)[];
  afterAll: (() => Promise<void> | void)[];
  beforeEach: (() => Promise<void> | void)[];
  afterEach: (() => Promise<void> | void)[];
} 
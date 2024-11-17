import * as path from 'path';
import * as fs from 'fs/promises';
import { TestSuiteConfig } from '../types';
import { Logger } from './Logger';

const logger = new Logger('Config');

export async function loadConfig(configPath: string): Promise<TestSuiteConfig> {
  try {
    const absolutePath = path.resolve(process.cwd(), configPath);
    
    // Check if config exists
    try {
      await fs.access(absolutePath);
    } catch {
      logger.info('No config file found, using defaults');
      return getDefaultConfig();
    }

    // Load and validate config
    const userConfig = require(absolutePath);
    return validateConfig({ ...getDefaultConfig(), ...userConfig });

  } catch (error) {
    logger.error('Failed to load config', error);
    return getDefaultConfig();
  }
}

export async function createDefaultConfig(): Promise<void> {
  const configPath = path.join(process.cwd(), 'test.config.js');
  const defaultConfig = getDefaultConfig();

  const configContent = `module.exports = ${JSON.stringify(defaultConfig, null, 2)}`;

  await fs.writeFile(configPath, configContent);
}

function getDefaultConfig(): TestSuiteConfig {
  return {
    maxWorkers: Math.max(1, Math.floor(require('os').cpus().length * 0.75)),
    timeout: 5000,
    retries: 0,
    bail: false,
    
    reporters: [
      { name: 'console' },
      { name: 'html', options: { outputFile: 'test-report.html' } }
    ],
    outputDir: './test-results',
    
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
    testIgnore: ['**/node_modules/**'],
    
    env: {},
    setupFiles: [],
    teardownFiles: [],
    
    cache: true,
    parallel: true,
    watch: false,
    verbose: false
  };
}

function validateConfig(config: TestSuiteConfig): TestSuiteConfig {
  // Add validation logic here
  return config;
} 
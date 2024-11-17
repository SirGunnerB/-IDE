import { TestConfig } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ConfigManager {
  async load(configPath: string): Promise<TestConfig> {
    try {
      const fullPath = path.resolve(process.cwd(), configPath);
      return require(fullPath);
    } catch (error) {
      throw new Error(`Failed to load config from ${configPath}: ${error}`);
    }
  }

  async validate(config: TestConfig): Promise<TestConfig> {
    // Add validation logic as needed
    return config;
  }

  async createDefault(force = false): Promise<void> {
    const configPath = path.join(process.cwd(), 'test.config.js');
    if (!force && await this.fileExists(configPath)) {
      throw new Error('Config file already exists. Use --force to overwrite.');
    }

    const defaultConfig = `module.exports = {
  testDir: './tests',
  timeout: 5000,
  parallel: 1
}`;

    await fs.writeFile(configPath, defaultConfig, 'utf8');
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
} 
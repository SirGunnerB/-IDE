import { Logger } from '../utils/Logger';
import { FileSystem } from '../utils/FileSystem';
import { deepMerge } from '../utils/objectUtils';
import * as path from 'path';
import * as dotenv from 'dotenv';

export class ConfigManager {
  private static instance: ConfigManager;
  private readonly logger = new Logger('ConfigManager');
  private readonly fs = new FileSystem();
  private config: any = {};
  private envConfig: any = {};

  private constructor() {
    this.loadEnvConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async load(options: LoadOptions = {}): Promise<void> {
    const {
      configPath = 'config',
      env = process.env.NODE_ENV || 'development',
      override = true
    } = options;

    try {
      // Load base config
      const baseConfig = await this.loadConfigFile(
        path.join(configPath, 'default')
      );

      // Load environment specific config
      const envConfig = await this.loadConfigFile(
        path.join(configPath, env)
      );

      // Load local config if it exists
      const localConfig = await this.loadConfigFile(
        path.join(configPath, 'local')
      );

      // Merge configs
      this.config = deepMerge(
        {},
        baseConfig,
        envConfig,
        localConfig,
        override ? this.envConfig : {}
      );

      this.logger.info(`Configuration loaded for environment: ${env}`);
    } catch (error) {
      this.logger.error('Failed to load configuration', error);
      throw error;
    }
  }

  private async loadConfigFile(filePath: string): Promise<any> {
    try {
      const resolvedPath = require.resolve(filePath);
      return require(resolvedPath);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        return {};
      }
      throw error;
    }
  }

  private loadEnvConfig(): void {
    dotenv.config();

    this.envConfig = Object.entries(process.env).reduce((config, [key, value]) => {
      if (key.startsWith('APP_')) {
        const configKey = key
          .slice(4)
          .toLowerCase()
          .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        
        return deepMerge(config, this.parseEnvValue(configKey, value));
      }
      return config;
    }, {});
  }

  private parseEnvValue(key: string, value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    return this.getNestedValue(this.config, key) ?? defaultValue;
  }

  private getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((value, part) => value?.[part], obj);
  }

  set(key: string, value: any): void {
    const parts = key.split('.');
    const lastPart = parts.pop()!;
    
    let current = this.config;
    for (const part of parts) {
      current[part] = current[part] || {};
      current = current[part];
    }
    
    current[lastPart] = value;
  }

  validate(schema: any): boolean {
    // Implementation of configuration validation
    // This could use JSON Schema or another validation library
    return true;
  }

  async save(filePath: string): Promise<void> {
    await this.fs.writeFile(
      filePath,
      JSON.stringify(this.config, null, 2)
    );
  }
}

interface LoadOptions {
  configPath?: string;
  env?: string;
  override?: boolean;
}

// Export singleton instance
export const config = ConfigManager.getInstance(); 
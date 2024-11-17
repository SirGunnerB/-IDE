import { Logger } from '../../utils/Logger';
import { FileSystem } from '../../utils/FileSystem';
import { DataGenerator } from '../generators/DataGenerator';
import * as path from 'path';

export class FixtureManager {
  private readonly logger = new Logger('FixtureManager');
  private readonly fs = new FileSystem();
  private readonly generator = new DataGenerator();
  private readonly fixtures = new Map<string, any>();

  constructor(private readonly config: FixtureConfig) {}

  async load(name: string): Promise<any> {
    if (this.fixtures.has(name)) {
      return this.fixtures.get(name);
    }

    const fixture = await this.loadFixture(name);
    this.fixtures.set(name, fixture);
    return fixture;
  }

  async loadAll(): Promise<Map<string, any>> {
    const files = await this.fs.glob(
      path.join(this.config.fixturesDir, '**/*.{json,js,ts}')
    );

    for (const file of files) {
      const name = path.basename(file, path.extname(file));
      await this.load(name);
    }

    return this.fixtures;
  }

  private async loadFixture(name: string): Promise<any> {
    const filePath = this.resolveFixturePath(name);
    
    try {
      if (await this.fs.exists(filePath)) {
        return this.loadFromFile(filePath);
      }
      return this.generateFixture(name);
    } catch (error) {
      this.logger.error(`Failed to load fixture: ${name}`, error);
      throw error;
    }
  }

  private resolveFixturePath(name: string): string {
    const extensions = ['.json', '.js', '.ts'];
    
    for (const ext of extensions) {
      const filePath = path.join(this.config.fixturesDir, `${name}${ext}`);
      if (this.fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return path.join(this.config.fixturesDir, `${name}.json`);
  }

  private async loadFromFile(filePath: string): Promise<any> {
    const ext = path.extname(filePath);
    
    if (ext === '.json') {
      const content = await this.fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    }
    
    return require(filePath);
  }

  private generateFixture(name: string): any {
    switch (name) {
      case 'users':
        return this.generator.users(10);
      case 'products':
        return this.generator.custom(() => this.generator.product(), 20);
      case 'orders':
        return this.generator.custom(() => this.generator.order(), 15);
      default:
        throw new Error(`No generator defined for fixture: ${name}`);
    }
  }

  async save(name: string, data: any): Promise<void> {
    const filePath = this.resolveFixturePath(name);
    await this.fs.writeFile(filePath, JSON.stringify(data, null, 2));
    this.fixtures.set(name, data);
  }

  clear(): void {
    this.fixtures.clear();
  }
}

export class DatabaseFixture {
  constructor(
    private readonly db: any,
    private readonly fixtures: FixtureManager
  ) {}

  async setup(): Promise<void> {
    const fixtures = await this.fixtures.loadAll();
    
    for (const [table, data] of fixtures) {
      await this.db.table(table).insert(data);
    }
  }

  async teardown(): Promise<void> {
    const fixtures = await this.fixtures.loadAll();
    
    for (const table of fixtures.keys()) {
      await this.db.table(table).truncate();
    }
  }
} 
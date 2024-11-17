import { TestSetup } from '../types';
import { Logger } from '../../utils/Logger';
import { DockerCompose } from './DockerCompose';
import { DatabaseSetup } from './DatabaseSetup';
import { TestEnvironment } from './TestEnvironment';

export class IntegrationTestSetup implements TestSetup {
  private readonly logger = new Logger('IntegrationSetup');
  private readonly docker: DockerCompose;
  private readonly db: DatabaseSetup;
  private readonly env: TestEnvironment;

  constructor(private readonly config: TestSetupConfig) {
    this.docker = new DockerCompose(config.dockerComposeFile);
    this.db = new DatabaseSetup(config.database);
    this.env = new TestEnvironment();
  }

  async setup(): Promise<void> {
    this.logger.info('Setting up integration test environment');

    try {
      // Start required services
      await this.startServices();

      // Setup database
      await this.setupDatabase();

      // Configure environment
      await this.configureEnvironment();

      this.logger.info('Integration test environment ready');
    } catch (error) {
      this.logger.error('Setup failed', error);
      await this.cleanup();
      throw error;
    }
  }

  private async startServices(): Promise<void> {
    await this.docker.up();
    await this.docker.waitForHealthy();
  }

  private async setupDatabase(): Promise<void> {
    await this.db.migrate();
    await this.db.seed();
  }

  private async configureEnvironment(): Promise<void> {
    const services = await this.docker.getServiceUrls();
    await this.env.configure(services);
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up integration test environment');

    try {
      await this.db.cleanup();
      await this.docker.down();
      await this.env.cleanup();
    } catch (error) {
      this.logger.error('Cleanup failed', error);
      throw error;
    }
  }
} 
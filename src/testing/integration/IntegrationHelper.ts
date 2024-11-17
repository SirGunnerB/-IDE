import { Logger } from '../../utils/Logger';
import { DockerCompose } from './DockerCompose';
import { DatabaseHelper } from './DatabaseHelper';
import { MockServices } from './MockServices';
import { TestEnvironment } from './TestEnvironment';

export class IntegrationHelper {
  private readonly logger = new Logger('IntegrationHelper');
  private readonly docker: DockerCompose;
  private readonly db: DatabaseHelper;
  private readonly mocks: MockServices;
  private readonly env: TestEnvironment;

  constructor(private readonly config: IntegrationConfig) {
    this.docker = new DockerCompose(config.dockerCompose);
    this.db = new DatabaseHelper(config.database);
    this.mocks = new MockServices(config.mocks);
    this.env = new TestEnvironment(config.environment);
  }

  async setup(): Promise<void> {
    this.logger.info('Setting up integration test environment');

    try {
      await this.startServices();
      await this.setupDatabase();
      await this.setupMocks();
      await this.configureEnvironment();
    } catch (error) {
      this.logger.error('Integration setup failed', error);
      await this.cleanup();
      throw error;
    }
  }

  private async startServices(): Promise<void> {
    await this.docker.up();
    await this.docker.waitForHealthy({
      timeout: this.config.serviceTimeout || 30000,
      interval: 1000
    });
  }

  private async setupDatabase(): Promise<void> {
    await this.db.migrate();
    if (this.config.seedDatabase) {
      await this.db.seed();
    }
  }

  private async setupMocks(): Promise<void> {
    await this.mocks.start();
    await this.mocks.configure(this.config.mockResponses);
  }

  private async configureEnvironment(): Promise<void> {
    const services = await this.docker.getServiceUrls();
    await this.env.configure({
      ...services,
      ...this.config.environment
    });
  }

  async getConnection(service: string): Promise<any> {
    switch (service) {
      case 'database':
        return this.db.getConnection();
      case 'redis':
        return this.mocks.getRedisClient();
      case 'kafka':
        return this.mocks.getKafkaClient();
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up integration test environment');

    try {
      await this.mocks.stop();
      await this.db.cleanup();
      await this.docker.down();
      await this.env.cleanup();
    } catch (error) {
      this.logger.error('Cleanup failed', error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    await this.db.reset();
    await this.mocks.reset();
  }
} 
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../../utils/Logger';
import { retry } from '../../utils/retry';

const execAsync = promisify(exec);

export class DockerCompose {
  private readonly logger = new Logger('DockerCompose');

  constructor(private readonly configFile: string) {}

  async up(): Promise<void> {
    await this.runCommand('up -d');
  }

  async down(): Promise<void> {
    await this.runCommand('down -v');
  }

  async waitForHealthy(): Promise<void> {
    await retry(async () => {
      const { stdout } = await this.runCommand('ps');
      if (stdout.includes('unhealthy') || stdout.includes('starting')) {
        throw new Error('Services not healthy yet');
      }
    }, {
      attempts: 30,
      delay: 1000,
      onRetry: (error) => {
        this.logger.debug('Waiting for services to be healthy...', error);
      }
    });
  }

  async getServiceUrls(): Promise<Record<string, string>> {
    const { stdout } = await this.runCommand('port');
    return this.parseServiceUrls(stdout);
  }

  private async runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    const fullCommand = `docker-compose -f ${this.configFile} ${command}`;
    this.logger.debug(`Running command: ${fullCommand}`);
    
    try {
      return await execAsync(fullCommand);
    } catch (error) {
      this.logger.error(`Command failed: ${fullCommand}`, error);
      throw error;
    }
  }

  private parseServiceUrls(output: string): Record<string, string> {
    const urls: Record<string, string> = {};
    const lines = output.split('\n');

    for (const line of lines) {
      const [service, ports] = line.split(' -> ');
      if (service && ports) {
        urls[service.trim()] = ports.trim();
      }
    }

    return urls;
  }
} 
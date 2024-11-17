import { Command } from 'commander';
import { Logger } from '../../utils/Logger';
import { config } from '../../config/ConfigManager';
import { TestRunner } from '../../testing/runners/TestRunner';
import { ReportGenerator } from '../reporting/ReportGenerator';
import { Benchmark } from '../benchmarking/Benchmark';

export class CommandLineInterface {
  private readonly logger = new Logger('CLI');
  private readonly program: Command;

  constructor() {
    this.program = new Command()
      .version('1.0.0')
      .description('Test Runner CLI');

    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .command('test')
      .description('Run tests')
      .option('-p, --pattern <pattern>', 'Test file pattern')
      .option('-t, --tag <tags>', 'Run tests with specific tags')
      .option('--parallel', 'Run tests in parallel')
      .option('--coverage', 'Collect coverage')
      .action(this.handleTest.bind(this));

    this.program
      .command('benchmark')
      .description('Run benchmarks')
      .option('-n, --name <name>', 'Benchmark name')
      .option('-i, --iterations <n>', 'Number of iterations')
      .action(this.handleBenchmark.bind(this));

    this.program
      .command('report')
      .description('Generate reports')
      .option('-t, --type <type>', 'Report type')
      .option('-o, --output <dir>', 'Output directory')
      .action(this.handleReport.bind(this));

    this.program
      .command('config')
      .description('Manage configuration')
      .option('--show', 'Show current configuration')
      .option('--set <key=value>', 'Set configuration value')
      .action(this.handleConfig.bind(this));
  }

  async run(args: string[] = process.argv): Promise<void> {
    try {
      await this.program.parseAsync(args);
    } catch (error) {
      this.logger.error('Command failed', error);
      process.exit(1);
    }
  }

  private async handleTest(options: any): Promise<void> {
    const runner = new TestRunner({
      pattern: options.pattern,
      tags: options.tag?.split(','),
      parallel: options.parallel,
      coverage: options.coverage
    });

    try {
      const results = await runner.run();
      
      if (options.coverage) {
        await this.generateCoverageReport(results);
      }

      process.exit(results.failed > 0 ? 1 : 0);
    } catch (error) {
      this.logger.error('Test run failed', error);
      process.exit(1);
    }
  }

  private async handleBenchmark(options: any): Promise<void> {
    const benchmark = new Benchmark({
      name: options.name,
      iterations: options.iterations
    });

    try {
      await benchmark.run();
    } catch (error) {
      this.logger.error('Benchmark failed', error);
      process.exit(1);
    }
  }

  private async handleReport(options: any): Promise<void> {
    const generator = new ReportGenerator({
      type: options.type,
      outputDir: options.output
    });

    try {
      await generator.generate();
    } catch (error) {
      this.logger.error('Report generation failed', error);
      process.exit(1);
    }
  }

  private async handleConfig(options: any): Promise<void> {
    if (options.show) {
      console.log(JSON.stringify(config.getAll(), null, 2));
      return;
    }

    if (options.set) {
      const [key, value] = options.set.split('=');
      config.set(key, this.parseValue(value));
      await config.save();
    }
  }

  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private async generateCoverageReport(results: any): Promise<void> {
    const generator = new ReportGenerator({
      type: 'coverage',
      outputDir: 'coverage'
    });

    await generator.generate(results);
  }
}

// Export CLI instance
export const cli = new CommandLineInterface(); 
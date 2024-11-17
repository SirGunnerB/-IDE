import { Parser } from './Parser';
import { MarkdownBuilder } from './MarkdownBuilder';
import { Logger } from '../utils/Logger';
import { FileSystem } from '../utils/FileSystem';
import { glob } from 'glob';
import { promisify } from 'util';
import * as path from 'path';

const globAsync = promisify(glob);

export class DocumentationGenerator {
  private readonly logger = new Logger('DocGen');
  private readonly parser: Parser;
  private readonly builder: MarkdownBuilder;
  private readonly fs: FileSystem;

  constructor(private readonly config: DocGenConfig) {
    this.parser = new Parser();
    this.builder = new MarkdownBuilder();
    this.fs = new FileSystem();
  }

  async generate(): Promise<void> {
    try {
      const files = await this.findSourceFiles();
      const documentation = await this.processFiles(files);
      await this.writeDocumentation(documentation);
      
      this.logger.info('Documentation generated successfully');
    } catch (error) {
      this.logger.error('Documentation generation failed', error);
      throw error;
    }
  }

  private async findSourceFiles(): Promise<string[]> {
    const patterns = this.config.include.map(pattern => 
      path.join(this.config.sourceDir, pattern)
    );

    const files = await globAsync(patterns, {
      ignore: this.config.exclude.map(pattern => 
        path.join(this.config.sourceDir, pattern)
      )
    });

    return files;
  }

  private async processFiles(files: string[]): Promise<Documentation> {
    const documentation: Documentation = {
      modules: [],
      classes: [],
      interfaces: [],
      functions: []
    };

    for (const file of files) {
      const content = await this.fs.readFile(file, 'utf-8');
      const parsed = this.parser.parse(content, file);
      this.mergeDocumentation(documentation, parsed);
    }

    return documentation;
  }

  private mergeDocumentation(target: Documentation, source: Documentation): void {
    target.modules.push(...source.modules);
    target.classes.push(...source.classes);
    target.interfaces.push(...source.interfaces);
    target.functions.push(...source.functions);
  }

  private async writeDocumentation(documentation: Documentation): Promise<void> {
    const markdown = this.builder.build(documentation);
    
    await this.fs.ensureDir(this.config.outputDir);
    
    // Write main documentation
    await this.fs.writeFile(
      path.join(this.config.outputDir, 'API.md'),
      markdown.api
    );

    // Write guides
    for (const [name, content] of Object.entries(markdown.guides)) {
      await this.fs.writeFile(
        path.join(this.config.outputDir, `${name}.md`),
        content
      );
    }

    // Generate index
    await this.fs.writeFile(
      path.join(this.config.outputDir, 'README.md'),
      this.builder.buildIndex(documentation)
    );
  }
} 
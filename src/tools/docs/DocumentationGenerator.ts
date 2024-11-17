import { Logger } from '../../utils/Logger';
import { FileSystem } from '../../utils/FileSystem';
import { Parser } from './Parser';
import { MarkdownBuilder } from './MarkdownBuilder';
import { TypescriptParser } from './TypescriptParser';
import * as path from 'path';

export class DocumentationGenerator {
  private readonly logger = new Logger('DocGen');
  private readonly fs = new FileSystem();
  private readonly parser: Parser;
  private readonly tsParser: TypescriptParser;
  private readonly markdown: MarkdownBuilder;

  constructor(private readonly config: DocGenConfig) {
    this.parser = new Parser();
    this.tsParser = new TypescriptParser();
    this.markdown = new MarkdownBuilder(config.templates);
  }

  async generate(): Promise<void> {
    this.logger.info('Starting documentation generation');

    try {
      const files = await this.collectFiles();
      const documentation = await this.parseFiles(files);
      await this.generateDocs(documentation);
      
      this.logger.info('Documentation generated successfully');
    } catch (error) {
      this.logger.error('Documentation generation failed', error);
      throw error;
    }
  }

  private async collectFiles(): Promise<string[]> {
    const patterns = this.config.include.map(pattern => 
      path.join(this.config.sourceDir, pattern)
    );

    const files = await this.fs.glob(patterns, {
      ignore: this.config.exclude
    });

    this.logger.debug(`Found ${files.length} files to process`);
    return files;
  }

  private async parseFiles(files: string[]): Promise<Documentation> {
    const documentation: Documentation = {
      classes: [],
      interfaces: [],
      types: [],
      functions: [],
      components: []
    };

    for (const file of files) {
      const content = await this.fs.readFile(file, 'utf-8');
      const fileDoc = await this.parseFile(file, content);
      this.mergeDocumentation(documentation, fileDoc);
    }

    return documentation;
  }

  private async parseFile(file: string, content: string): Promise<Documentation> {
    const ext = path.extname(file);
    
    switch (ext) {
      case '.ts':
      case '.tsx':
        return this.tsParser.parse(content, file);
      case '.js':
      case '.jsx':
        return this.parser.parseJavaScript(content, file);
      default:
        return this.parser.parseMarkdown(content, file);
    }
  }

  private mergeDocumentation(target: Documentation, source: Documentation): void {
    target.classes.push(...source.classes);
    target.interfaces.push(...source.interfaces);
    target.types.push(...source.types);
    target.functions.push(...source.functions);
    target.components.push(...source.components);
  }

  private async generateDocs(documentation: Documentation): Promise<void> {
    await this.fs.ensureDir(this.config.outputDir);

    // Generate API documentation
    await this.generateApiDocs(documentation);

    // Generate guides
    await this.generateGuides(documentation);

    // Generate index
    await this.generateIndex(documentation);

    // Generate search index
    await this.generateSearchIndex(documentation);
  }

  private async generateApiDocs(documentation: Documentation): Promise<void> {
    const apiDir = path.join(this.config.outputDir, 'api');
    await this.fs.ensureDir(apiDir);

    // Generate class documentation
    for (const classDoc of documentation.classes) {
      const content = this.markdown.buildClassDoc(classDoc);
      await this.fs.writeFile(
        path.join(apiDir, `${classDoc.name}.md`),
        content
      );
    }

    // Generate interface documentation
    for (const interfaceDoc of documentation.interfaces) {
      const content = this.markdown.buildInterfaceDoc(interfaceDoc);
      await this.fs.writeFile(
        path.join(apiDir, `${interfaceDoc.name}.md`),
        content
      );
    }

    // Generate component documentation
    for (const componentDoc of documentation.components) {
      const content = this.markdown.buildComponentDoc(componentDoc);
      await this.fs.writeFile(
        path.join(apiDir, `${componentDoc.name}.md`),
        content
      );
    }
  }

  private async generateGuides(documentation: Documentation): Promise<void> {
    const guidesDir = path.join(this.config.outputDir, 'guides');
    await this.fs.ensureDir(guidesDir);

    const guides = await this.collectGuides();
    for (const guide of guides) {
      const content = await this.processGuide(guide, documentation);
      await this.fs.writeFile(
        path.join(guidesDir, path.basename(guide)),
        content
      );
    }
  }

  private async generateIndex(documentation: Documentation): Promise<void> {
    const content = this.markdown.buildIndex(documentation);
    await this.fs.writeFile(
      path.join(this.config.outputDir, 'README.md'),
      content
    );
  }

  private async generateSearchIndex(documentation: Documentation): Promise<void> {
    const searchIndex = this.buildSearchIndex(documentation);
    await this.fs.writeFile(
      path.join(this.config.outputDir, 'search-index.json'),
      JSON.stringify(searchIndex, null, 2)
    );
  }

  private async collectGuides(): Promise<string[]> {
    const guidesPattern = path.join(this.config.guidesDir, '**/*.md');
    return this.fs.glob(guidesPattern);
  }

  private async processGuide(
    guidePath: string,
    documentation: Documentation
  ): Promise<string> {
    const content = await this.fs.readFile(guidePath, 'utf-8');
    return this.markdown.processGuide(content, documentation);
  }

  private buildSearchIndex(documentation: Documentation): SearchIndex {
    return {
      classes: documentation.classes.map(c => ({
        type: 'class',
        name: c.name,
        description: c.description,
        path: `api/${c.name}.md`
      })),
      interfaces: documentation.interfaces.map(i => ({
        type: 'interface',
        name: i.name,
        description: i.description,
        path: `api/${i.name}.md`
      })),
      components: documentation.components.map(c => ({
        type: 'component',
        name: c.name,
        description: c.description,
        path: `api/${c.name}.md`
      }))
    };
  }
} 
import * as ts from 'typescript';
import { Logger } from '../utils/Logger';
import { FileSystem } from '../utils/FileSystem';
import { MarkdownBuilder } from './MarkdownBuilder';

export class ApiDocGenerator {
  private readonly logger = new Logger('ApiDocGenerator');
  private readonly fs = new FileSystem();
  private readonly markdown = new MarkdownBuilder();
  private program: ts.Program;

  constructor(private readonly config: ApiDocConfig) {
    this.program = ts.createProgram(config.files, {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.CommonJS,
    });
  }

  async generate(): Promise<void> {
    try {
      const documentation = this.extractDocumentation();
      await this.generateFiles(documentation);
      this.logger.info('API documentation generated successfully');
    } catch (error) {
      this.logger.error('Failed to generate API documentation', error);
      throw error;
    }
  }

  private extractDocumentation(): ApiDocumentation {
    const documentation: ApiDocumentation = {
      classes: [],
      interfaces: [],
      types: [],
      functions: []
    };

    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        ts.forEachChild(sourceFile, node => {
          this.visitNode(node, documentation);
        });
      }
    }

    return documentation;
  }

  private visitNode(node: ts.Node, documentation: ApiDocumentation): void {
    if (ts.isClassDeclaration(node)) {
      documentation.classes.push(this.extractClassDoc(node));
    } else if (ts.isInterfaceDeclaration(node)) {
      documentation.interfaces.push(this.extractInterfaceDoc(node));
    } else if (ts.isTypeAliasDeclaration(node)) {
      documentation.types.push(this.extractTypeDoc(node));
    } else if (ts.isFunctionDeclaration(node)) {
      documentation.functions.push(this.extractFunctionDoc(node));
    }
  }

  private extractClassDoc(node: ts.ClassDeclaration): ClassDoc {
    return {
      name: node.name?.text ?? 'Anonymous',
      description: this.getJsDocComment(node),
      methods: this.extractMethods(node),
      properties: this.extractProperties(node),
      decorators: this.extractDecorators(node)
    };
  }

  private getJsDocComment(node: ts.Node): string {
    const jsDoc = ts.getJSDocTags(node);
    return jsDoc.map(doc => doc.getText()).join('\n');
  }

  private async generateFiles(documentation: ApiDocumentation): Promise<void> {
    await this.fs.ensureDir(this.config.outputDir);

    // Generate main API documentation
    const apiContent = this.markdown.buildApiDoc(documentation);
    await this.fs.writeFile(
      `${this.config.outputDir}/api.md`,
      apiContent
    );

    // Generate individual class documentation
    for (const classDoc of documentation.classes) {
      const content = this.markdown.buildClassDoc(classDoc);
      await this.fs.writeFile(
        `${this.config.outputDir}/classes/${classDoc.name}.md`,
        content
      );
    }

    // Generate index
    const indexContent = this.markdown.buildIndex(documentation);
    await this.fs.writeFile(
      `${this.config.outputDir}/README.md`,
      indexContent
    );
  }
} 
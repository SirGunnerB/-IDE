interface DocumentationConfig {
  format: 'markdown' | 'html' | 'pdf';
  output: string;
  templates: Record<string, string>;
  includes: string[];
  excludes: string[];
}

interface DocumentationNode {
  type: 'class' | 'interface' | 'function' | 'variable';
  name: string;
  description: string;
  params?: ParamDoc[];
  returns?: ReturnDoc;
  examples?: string[];
}

export class DocumentationGeneratorService {
  private parser: DocParser;
  private formatter: DocFormatter;
  private templates: Map<string, Template>;

  async generateDocumentation(config: DocumentationConfig): Promise<void> {
    const files = await this.getDocumentableFiles(config);
    const documentation = await this.processFiles(files);
    
    const formatted = await this.formatDocumentation(documentation, config);
    await this.writeOutput(formatted, config.output);
  }

  private async processFiles(files: string[]): Promise<DocumentationNode[]> {
    const nodes: DocumentationNode[] = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const ast = await this.parser.parse(content);
      
      const fileNodes = await this.extractDocumentation(ast);
      nodes.push(...fileNodes);
    }

    return this.organizeDocumentation(nodes);
  }

  private async formatDocumentation(
    nodes: DocumentationNode[],
    config: DocumentationConfig
  ): Promise<string> {
    const template = this.templates.get(config.format);
    if (!template) {
      throw new Error(`No template found for format: ${config.format}`);
    }

    return template.render({
      nodes,
      config
    });
  }
} 
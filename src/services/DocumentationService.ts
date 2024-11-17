interface DocConfig {
  format: 'markdown' | 'html' | 'pdf';
  output: string;
  includes: string[];
  excludes: string[];
  template?: string;
}

export class DocumentationService {
  async generateDocs(projectPath: string, config: DocConfig) {
    const files = await this.getDocumentableFiles(projectPath, config);
    const docs = await Promise.all(files.map(file => this.parseFile(file)));
    
    const documentation = this.formatDocumentation(docs, config.format);
    await this.writeOutput(documentation, config.output);
  }

  private async parseFile(filePath: string) {
    const content = await fs.readFile(filePath, 'utf-8');
    const ast = this.parseCode(content);
    
    return {
      classes: this.extractClasses(ast),
      functions: this.extractFunctions(ast),
      interfaces: this.extractInterfaces(ast),
      comments: this.extractComments(ast)
    };
  }

  private formatDocumentation(docs: any[], format: DocConfig['format']) {
    switch (format) {
      case 'markdown':
        return this.generateMarkdown(docs);
      case 'html':
        return this.generateHTML(docs);
      case 'pdf':
        return this.generatePDF(docs);
      default:
        throw new Error(`Unsupported documentation format: ${format}`);
    }
  }
} 
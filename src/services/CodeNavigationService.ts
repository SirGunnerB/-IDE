interface NavigationIndex {
  symbols: SymbolInfo[];
  references: ReferenceInfo[];
  definitions: DefinitionInfo[];
  implementations: ImplementationInfo[];
}

interface NavigationLocation {
  uri: string;
  range: Range;
  type: 'definition' | 'reference' | 'implementation';
}

export class CodeNavigationService {
  private index: NavigationIndex;
  private parser: CodeParser;
  private analyzer: CodeAnalyzer;

  async buildNavigationIndex(files: string[]): Promise<void> {
    this.index = {
      symbols: [],
      references: [],
      definitions: [],
      implementations: []
    };

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const ast = await this.parser.parse(content);
      
      await this.indexFile(file, ast);
    }
  }

  async findReferences(uri: string, position: Position): Promise<NavigationLocation[]> {
    const symbol = await this.getSymbolAtPosition(uri, position);
    if (!symbol) return [];

    return this.index.references
      .filter(ref => ref.targetId === symbol.id)
      .map(ref => ({
        uri: ref.uri,
        range: ref.range,
        type: 'reference'
      }));
  }

  private async indexFile(uri: string, ast: AST): Promise<void> {
    // Index symbols
    const symbols = this.analyzer.findSymbols(ast);
    this.index.symbols.push(...symbols.map(s => ({ ...s, uri })));

    // Index references
    const references = this.analyzer.findReferences(ast);
    this.index.references.push(...references.map(r => ({ ...r, uri })));

    // Index definitions and implementations
    const definitions = this.analyzer.findDefinitions(ast);
    this.index.definitions.push(...definitions.map(d => ({ ...d, uri })));
  }
} 
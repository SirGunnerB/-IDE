interface CompletionContext {
  document: TextDocument;
  position: Position;
  triggerCharacter?: string;
  triggerKind: CompletionTriggerKind;
}

interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  sortText?: string;
  filterText?: string;
  insertText: string;
  range: Range;
}

export class CodeCompletionService {
  private providers: CompletionProvider[] = [];
  private cache: CompletionCache;
  private analyzer: CodeAnalyzer;

  async provideCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const document = context.document;
    const position = context.position;

    // Check cache first
    const cached = this.cache.get(document, position);
    if (cached) return cached;

    // Get completions from all providers
    const completions = await Promise.all(
      this.providers.map(provider => provider.provideCompletions(context))
    );

    // Merge and sort completions
    const merged = this.mergeCompletions(completions.flat());
    
    // Cache results
    this.cache.set(document, position, merged);
    
    return merged;
  }

  private async analyzeContext(context: CompletionContext) {
    const document = context.document;
    const position = context.position;
    
    const ast = await this.analyzer.parseDocument(document);
    const node = this.analyzer.findNodeAtPosition(ast, position);
    
    return {
      ast,
      node,
      scope: this.analyzer.getScope(node),
      imports: this.analyzer.getImports(ast),
      exports: this.analyzer.getExports(ast)
    };
  }
} 
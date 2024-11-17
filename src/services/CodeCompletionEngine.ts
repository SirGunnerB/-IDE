interface CompletionContext {
  document: TextDocument;
  position: Position;
  triggerKind: CompletionTriggerKind;
  triggerCharacter?: string;
}

interface CompletionProvider {
  id: string;
  selector: DocumentSelector;
  provider: (context: CompletionContext) => Promise<CompletionItem[]>;
  triggerCharacters?: string[];
}

export class CodeCompletionEngine {
  private providers: CompletionProvider[] = [];
  private cache: CompletionCache;
  private analyzer: CodeAnalyzer;

  async provideCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    // Get relevant providers for the document
    const relevantProviders = this.getRelevantProviders(context.document);
    
    // Collect completions from all providers
    const completionsPromises = relevantProviders.map(provider => 
      this.getCompletionsFromProvider(provider, context)
    );

    const completions = await Promise.all(completionsPromises);
    
    // Merge and sort completions
    const mergedCompletions = this.mergeCompletions(completions.flat());
    
    // Filter and sort based on context
    const processedCompletions = await this.processCompletions(
      mergedCompletions,
      context
    );

    return processedCompletions;
  }

  private async getCompletionsFromProvider(
    provider: CompletionProvider,
    context: CompletionContext
  ): Promise<CompletionItem[]> {
    try {
      // Check cache first
      const cached = await this.cache.get(provider.id, context);
      if (cached) return cached;

      // Get completions from provider
      const completions = await provider.provider(context);
      
      // Cache results
      await this.cache.set(provider.id, context, completions);
      
      return completions;
    } catch (error) {
      console.error(`Error getting completions from provider ${provider.id}:`, error);
      return [];
    }
  }
} 
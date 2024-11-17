interface LanguageDefinition {
  id: string;
  name: string;
  extensions: string[];
  configuration: LanguageConfiguration;
  features: LanguageFeatures;
}

interface LanguageConfiguration {
  comments: {
    lineComment?: string;
    blockComment?: [string, string];
  };
  brackets: [string, string][];
  autoClosingPairs: [string, string][];
  surroundingPairs: [string, string][];
}

export class CustomLanguageService {
  private languages: Map<string, LanguageDefinition> = new Map();
  private tokenizers: Map<string, Tokenizer> = new Map();
  private parsers: Map<string, Parser> = new Map();

  async registerLanguage(definition: LanguageDefinition): Promise<void> {
    // Validate language definition
    await this.validateDefinition(definition);
    
    // Create language components
    const tokenizer = await this.createTokenizer(definition);
    const parser = await this.createParser(definition);
    
    // Register with editor
    await this.registerWithEditor(definition);
    
    // Setup language features
    await this.setupLanguageFeatures(definition);

    this.languages.set(definition.id, definition);
    this.tokenizers.set(definition.id, tokenizer);
    this.parsers.set(definition.id, parser);
  }

  private async setupLanguageFeatures(definition: LanguageDefinition): Promise<void> {
    if (definition.features.completion) {
      await this.setupCompletion(definition);
    }
    
    if (definition.features.hover) {
      await this.setupHover(definition);
    }
    
    if (definition.features.formatting) {
      await this.setupFormatting(definition);
    }
    
    if (definition.features.validation) {
      await this.setupValidation(definition);
    }
  }

  private async createTokenizer(definition: LanguageDefinition): Promise<Tokenizer> {
    return new Tokenizer({
      rules: definition.configuration.tokenRules,
      ignoreCase: definition.configuration.ignoreCase,
      keywords: definition.configuration.keywords
    });
  }
} 
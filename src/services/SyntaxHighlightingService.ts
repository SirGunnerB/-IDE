interface TokenizerConfig {
  language: string;
  rules: TokenRule[];
  states: Record<string, TokenState>;
}

interface TokenRule {
  regex: RegExp;
  token: string | string[];
  next?: string;
  push?: string;
  pop?: boolean;
}

export class SyntaxHighlightingService {
  private tokenizers: Map<string, MonacoTokenizer> = new Map();
  private themes: Map<string, TokenTheme> = new Map();

  async registerLanguageTokenizer(config: TokenizerConfig) {
    const tokenizer = new MonacoTokenizer(config);
    
    monaco.languages.setMonarchTokensProvider(config.language, {
      tokenizer: this.convertToMonarchTokenizer(config)
    });

    this.tokenizers.set(config.language, tokenizer);
  }

  async defineSemanticTokens(language: string, tokens: SemanticTokenType[]) {
    const legend = new SemanticTokensLegend(tokens);
    
    monaco.languages.registerDocumentSemanticTokensProvider(language, {
      getLegend: () => legend,
      provideDocumentSemanticTokens: async (model) => {
        const tokens = await this.analyzeSemanticTokens(model.getValue(), language);
        return this.encodeSemanticTokens(tokens, legend);
      }
    });
  }

  private async analyzeSemanticTokens(
    content: string,
    language: string
  ): Promise<SemanticToken[]> {
    const ast = await this.parseCode(content, language);
    return this.extractSemanticTokens(ast);
  }
} 
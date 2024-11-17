interface LanguageConfig {
  id: string;
  name: string;
  extensions: string[];
  syntaxHighlighting: any;
  formatter?: string;
  linter?: string;
}

export class LanguageService {
  private languages: Map<string, LanguageConfig> = new Map();
  private activeLanguageServers: Map<string, LanguageServer> = new Map();

  async registerLanguage(config: LanguageConfig) {
    this.languages.set(config.id, config);
    
    // Register with Monaco editor
    monaco.languages.register({
      id: config.id,
      extensions: config.extensions,
      aliases: [config.name]
    });

    // Setup language server if available
    if (config.formatter || config.linter) {
      await this.startLanguageServer(config);
    }
  }

  private async startLanguageServer(config: LanguageConfig) {
    const server = new LanguageServer({
      language: config.id,
      serverPath: config.formatter || config.linter,
      workspacePath: this.workspacePath
    });

    await server.start();
    this.activeLanguageServers.set(config.id, server);
  }
} 
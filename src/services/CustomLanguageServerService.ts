interface LanguageServerConfig {
  language: string;
  serverPath: string;
  capabilities: LSPCapabilities;
  initializationOptions?: any;
}

interface LSPCapabilities {
  completion?: boolean;
  definition?: boolean;
  references?: boolean;
  hover?: boolean;
  formatting?: boolean;
}

export class CustomLanguageServerService {
  private servers: Map<string, LanguageServer> = new Map();
  private connections: Map<string, LSPConnection> = new Map();

  async startLanguageServer(config: LanguageServerConfig): Promise<void> {
    const server = await this.createServer(config);
    const connection = await this.establishConnection(server);

    await this.initializeServer(connection, config);
    await this.registerCapabilities(connection, config.capabilities);

    this.servers.set(config.language, server);
    this.connections.set(config.language, connection);
  }

  private async createServer(config: LanguageServerConfig) {
    const serverProcess = spawn(config.serverPath, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return new LanguageServer(serverProcess, {
      reader: serverProcess.stdout,
      writer: serverProcess.stdin
    });
  }

  private async registerCapabilities(
    connection: LSPConnection,
    capabilities: LSPCapabilities
  ) {
    if (capabilities.completion) {
      this.registerCompletionProvider(connection);
    }
    if (capabilities.definition) {
      this.registerDefinitionProvider(connection);
    }
    // Register other capabilities...
  }
} 
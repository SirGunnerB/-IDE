interface ProtocolHandler {
  protocol: string;
  handler: (url: URL) => Promise<void>;
}

interface ProtocolAction {
  command: string;
  params: Record<string, string>;
}

export class ProtocolHandlerService {
  private handlers: Map<string, ProtocolHandler> = new Map();

  registerProtocolHandler(protocol: string, handler: (url: URL) => Promise<void>) {
    this.handlers.set(protocol, { protocol, handler });
    
    // Register with operating system
    this.registerSystemProtocol(protocol);
  }

  async handleUrl(url: string): Promise<void> {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol.replace(':', '');
    
    const handler = this.handlers.get(protocol);
    if (!handler) {
      throw new Error(`No handler registered for protocol: ${protocol}`);
    }
    
    await handler.handler(parsedUrl);
  }

  private async registerSystemProtocol(protocol: string) {
    if (process.platform === 'win32') {
      await this.registerWindowsProtocol(protocol);
    } else if (process.platform === 'darwin') {
      await this.registerMacProtocol(protocol);
    } else {
      await this.registerLinuxProtocol(protocol);
    }
  }

  private parseProtocolAction(url: URL): ProtocolAction {
    return {
      command: url.hostname,
      params: Object.fromEntries(url.searchParams)
    };
  }
} 
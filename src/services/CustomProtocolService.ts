interface ProtocolHandler {
  protocol: string;
  handler: (url: URL) => Promise<void>;
  validator?: (url: URL) => Promise<boolean>;
}

interface ProtocolAction {
  command: string;
  params: Record<string, string>;
  source: string;
}

export class CustomProtocolService {
  private handlers: Map<string, ProtocolHandler> = new Map();
  private securityPolicy: SecurityPolicy;

  async registerProtocol(handler: ProtocolHandler): Promise<void> {
    // Validate handler
    await this.validateHandler(handler);
    
    // Register with OS
    await this.registerWithOS(handler.protocol);
    
    // Store handler
    this.handlers.set(handler.protocol, handler);
  }

  async handleUrl(url: string): Promise<void> {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol.replace(':', '');
    
    const handler = this.handlers.get(protocol);
    if (!handler) {
      throw new Error(`No handler registered for protocol: ${protocol}`);
    }

    // Validate URL
    if (handler.validator) {
      const isValid = await handler.validator(parsedUrl);
      if (!isValid) {
        throw new Error('Invalid protocol URL');
      }
    }

    // Check security policy
    await this.securityPolicy.validateAction({
      protocol,
      url: parsedUrl,
      source: this.getSource()
    });

    // Handle URL
    await handler.handler(parsedUrl);
  }

  private async registerWithOS(protocol: string): Promise<void> {
    if (process.platform === 'win32') {
      await this.registerWindowsProtocol(protocol);
    } else if (process.platform === 'darwin') {
      await this.registerMacProtocol(protocol);
    } else {
      await this.registerLinuxProtocol(protocol);
    }
  }
} 
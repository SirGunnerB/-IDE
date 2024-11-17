interface LSPConnection {
  id: string;
  type: 'stdio' | 'socket' | 'node-ipc';
  capabilities: LSPCapabilities;
  status: ConnectionStatus;
}

interface LSPMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: LSPError;
}

export class LanguageServerProtocolService {
  private connections: Map<string, LSPConnection> = new Map();
  private handlers: Map<string, MessageHandler> = new Map();
  private pendingRequests: Map<number, PendingRequest> = new Map();

  async startServer(config: LSPServerConfig): Promise<string> {
    const connection = await this.createConnection(config);
    
    // Initialize connection
    await this.initializeConnection(connection);
    
    // Register capabilities
    await this.registerCapabilities(connection);
    
    // Setup message handlers
    this.setupMessageHandlers(connection);
    
    this.connections.set(connection.id, connection);
    return connection.id;
  }

  async sendRequest(connectionId: string, method: string, params: any): Promise<any> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error(`Connection ${connectionId} not found`);

    const request: LSPMessage = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id!, { resolve, reject });
      this.sendMessage(connection, request);
    });
  }

  private handleMessage(connection: LSPConnection, message: LSPMessage): void {
    if (message.id !== undefined) {
      if (message.method) {
        // Request
        this.handleRequest(connection, message);
      } else {
        // Response
        this.handleResponse(message);
      }
    } else {
      // Notification
      this.handleNotification(connection, message);
    }
  }

  private async handleRequest(connection: LSPConnection, request: LSPMessage): Promise<void> {
    const handler = this.handlers.get(request.method!);
    if (!handler) {
      this.sendError(connection, request.id!, {
        code: -32601,
        message: `Method not found: ${request.method}`
      });
      return;
    }

    try {
      const result = await handler(request.params);
      this.sendResponse(connection, request.id!, result);
    } catch (error) {
      this.sendError(connection, request.id!, {
        code: -32603,
        message: error.message
      });
    }
  }
} 
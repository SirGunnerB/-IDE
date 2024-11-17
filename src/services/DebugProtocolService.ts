interface DebugSession {
  id: string;
  type: string;
  name: string;
  configuration: DebugConfiguration;
  breakpoints: Map<string, Breakpoint[]>;
}

interface DebugProtocolMessage {
  seq: number;
  type: 'request' | 'response' | 'event';
  command?: string;
  event?: string;
  body?: any;
}

export class DebugProtocolService {
  private sessions: Map<string, DebugSession> = new Map();
  private adapters: Map<string, DebugAdapter> = new Map();
  private pendingRequests: Map<number, PendingRequest> = new Map();

  async startDebugSession(config: DebugConfiguration): Promise<string> {
    const session = await this.createDebugSession(config);
    
    // Initialize debug adapter
    const adapter = await this.initializeAdapter(session);
    
    // Configure adapter
    await this.configureAdapter(adapter, config);
    
    // Start debugging
    await this.launchOrAttach(session);

    this.sessions.set(session.id, session);
    this.adapters.set(session.id, adapter);
    
    return session.id;
  }

  async sendRequest(sessionId: string, command: string, args?: any): Promise<any> {
    const adapter = this.adapters.get(sessionId);
    if (!adapter) throw new Error(`Debug session ${sessionId} not found`);

    const request: DebugProtocolMessage = {
      seq: this.generateSequenceNumber(),
      type: 'request',
      command,
      body: args
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.seq, { resolve, reject });
      this.sendMessage(adapter, request);
    });
  }

  private handleMessage(adapter: DebugAdapter, message: DebugProtocolMessage): void {
    switch (message.type) {
      case 'response':
        this.handleResponse(message);
        break;
      case 'event':
        this.handleEvent(adapter, message);
        break;
      case 'request':
        this.handleRequest(adapter, message);
        break;
    }
  }
} 
interface TerminalSession {
  id: string;
  process: any; // pty.js process
  buffer: string[];
  config: TerminalConfig;
}

interface TerminalConfig {
  shell: string;
  env: Record<string, string>;
  cwd: string;
  cols: number;
  rows: number;
}

export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private pty = require('node-pty');

  async createTerminal(config: TerminalConfig): Promise<string> {
    const id = crypto.randomUUID();
    
    const process = this.pty.spawn(config.shell, [], {
      name: 'xterm-color',
      cols: config.cols,
      rows: config.rows,
      cwd: config.cwd,
      env: { ...process.env, ...config.env }
    });

    const session: TerminalSession = {
      id,
      process,
      buffer: [],
      config
    };

    this.setupTerminalHandlers(session);
    this.sessions.set(id, session);

    return id;
  }

  private setupTerminalHandlers(session: TerminalSession) {
    session.process.onData((data: string) => {
      session.buffer.push(data);
      this.emit('terminalData', { sessionId: session.id, data });
    });

    session.process.onExit(({ exitCode, signal }: any) => {
      this.handleTerminalExit(session.id, exitCode, signal);
    });
  }

  async resizeTerminal(sessionId: string, cols: number, rows: number) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Terminal session not found');

    session.process.resize(cols, rows);
    session.config.cols = cols;
    session.config.rows = rows;
  }
} 
interface DebugConfig {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program: string;
  args?: string[];
  env?: Record<string, string>;
  breakpoints?: Breakpoint[];
}

interface Breakpoint {
  id: string;
  file: string;
  line: number;
  condition?: string;
  hitCount?: number;
}

export class DebuggerService {
  private debugSession: DebugSession | null = null;
  private breakpoints: Map<string, Breakpoint[]> = new Map();
  private variables: Map<string, any> = new Map();

  async startDebugging(config: DebugConfig) {
    try {
      const adapter = await this.createDebugAdapter(config.type);
      this.debugSession = new DebugSession(adapter, config);
      
      await this.debugSession.initialize();
      await this.setBreakpoints(config.breakpoints || []);
      
      return this.debugSession.start();
    } catch (error) {
      console.error('Failed to start debugging:', error);
      throw error;
    }
  }

  async setBreakpoint(breakpoint: Breakpoint) {
    const fileBreakpoints = this.breakpoints.get(breakpoint.file) || [];
    fileBreakpoints.push(breakpoint);
    this.breakpoints.set(breakpoint.file, fileBreakpoints);

    if (this.debugSession) {
      await this.debugSession.setBreakpoints(breakpoint.file, fileBreakpoints);
    }
  }

  private createDebugAdapter(type: string): DebugAdapter {
    switch (type) {
      case 'node':
        return new NodeDebugAdapter();
      case 'python':
        return new PythonDebugAdapter();
      default:
        throw new Error(`Unsupported debug type: ${type}`);
    }
  }
} 
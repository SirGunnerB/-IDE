import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

export class DevServer {
  private app = express();
  private server = createServer(this.app);
  private wss = new WebSocketServer({ server: this.server });

  constructor(private port: number = 3000) {
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes() {
    this.app.use(express.static('public'));
    this.app.use(express.json());
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        // Handle live reload and file watching
      });
    });
  }

  public start() {
    this.server.listen(this.port, () => {
      console.log(`Development server running on port ${this.port}`);
    });
  }
} 
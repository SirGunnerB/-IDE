import * as React from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { spawn } from 'node-pty';

export const Terminal: React.FC = () => {
  const terminalRef = React.useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = React.useState<XTerm | null>(null);

  React.useEffect(() => {
    if (terminalRef.current) {
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      // Create shell process
      const shell = spawn(process.platform === 'win32' ? 'powershell.exe' : 'bash', [], {
        name: 'xterm-color',
        cols: term.cols,
        rows: term.rows,
        cwd: process.cwd(),
        env: process.env as { [key: string]: string },
      });

      // Handle data flow
      shell.onData((data) => term.write(data));
      term.onData((data) => shell.write(data));

      setTerminal(term);
    }
  }, []);

  return <div ref={terminalRef} style={{ height: '300px' }} />;
}; 
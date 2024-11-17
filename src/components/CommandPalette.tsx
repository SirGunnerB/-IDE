import * as React from 'react';

interface Command {
  id: string;
  title: string;
  category: string;
  execute: () => void;
}

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();

  registerCommand(command: Command) {
    this.commands.set(command.id, command);
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}

export const CommandPalette: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredCommands, setFilteredCommands] = React.useState<Command[]>([]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      setIsVisible(true);
    }
  };

  return (
    isVisible && (
      <div className="command-palette">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type a command..."
          autoFocus
        />
        <div className="command-list">
          {filteredCommands.map((command) => (
            <div
              key={command.id}
              className="command-item"
              onClick={() => {
                command.execute();
                setIsVisible(false);
              }}
            >
              <span className="title">{command.title}</span>
              <span className="category">{command.category}</span>
            </div>
          ))}
        </div>
      </div>
    )
  );
}; 
interface Keybinding {
  id: string;
  key: string;
  command: string;
  when?: string;
  args?: any[];
}

export class KeybindingService {
  private bindings: Map<string, Keybinding> = new Map();
  private customBindings: Map<string, Keybinding> = new Map();

  registerKeybinding(binding: Keybinding) {
    const key = this.normalizeKey(binding.key);
    this.bindings.set(key, binding);
  }

  async loadCustomKeybindings() {
    const configPath = path.join(process.env.APPDATA!, 'ai-editor', 'keybindings.json');
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const customBindings = JSON.parse(content);
      
      for (const binding of customBindings) {
        this.customBindings.set(this.normalizeKey(binding.key), binding);
      }
    } catch (error) {
      console.error('Failed to load custom keybindings:', error);
    }
  }

  handleKeyEvent(event: KeyboardEvent): boolean {
    const key = this.getKeyString(event);
    const binding = this.customBindings.get(key) || this.bindings.get(key);
    
    if (binding && this.evaluateWhenClause(binding.when)) {
      this.executeCommand(binding.command, binding.args);
      return true;
    }
    
    return false;
  }
} 
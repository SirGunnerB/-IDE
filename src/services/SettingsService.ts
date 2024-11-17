import { promises as fs } from 'fs';
import * as path from 'path';

interface EditorSettings {
  theme: string;
  fontSize: number;
  tabSize: number;
  autoSave: boolean;
  formatOnSave: boolean;
  // ... other settings
}

export class SettingsService {
  private settings: EditorSettings;
  private settingsPath: string;
  private watchers: Set<(settings: EditorSettings) => void> = new Set();

  constructor() {
    this.settingsPath = path.join(process.env.APPDATA!, 'ai-editor', 'settings.json');
    this.settings = this.loadDefaultSettings();
  }

  async initialize() {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf-8');
      this.settings = { ...this.settings, ...JSON.parse(data) };
    } catch (error) {
      await this.saveSettings();
    }
  }

  async saveSettings() {
    await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
    await fs.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2));
    this.notifyWatchers();
  }

  private notifyWatchers() {
    this.watchers.forEach(watcher => watcher(this.settings));
  }

  onSettingsChanged(callback: (settings: EditorSettings) => void) {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }
} 
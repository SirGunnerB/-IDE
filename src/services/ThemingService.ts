interface ThemeDefinition {
  id: string;
  name: string;
  type: 'light' | 'dark';
  colors: Record<string, string>;
  tokenColors: TokenColorRule[];
}

interface TokenColorRule {
  scope: string | string[];
  settings: {
    foreground?: string;
    fontStyle?: string;
  };
}

export class ThemingService {
  private themes: Map<string, ThemeDefinition> = new Map();
  private activeTheme: string | null = null;

  async loadTheme(themePath: string) {
    const themeContent = await fs.readFile(themePath, 'utf-8');
    const theme: ThemeDefinition = JSON.parse(themeContent);
    
    this.validateTheme(theme);
    this.themes.set(theme.id, theme);
  }

  applyTheme(themeId: string) {
    const theme = this.themes.get(themeId);
    if (!theme) throw new Error(`Theme ${themeId} not found`);

    this.activeTheme = themeId;
    this.applyColorVariables(theme.colors);
    this.applyEditorTheme(theme);
  }

  private applyColorVariables(colors: Record<string, string>) {
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  }
} 
interface ThemeColors {
  background: string;
  foreground: string;
  accent: string;
  // ... other color definitions
}

interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  tokenColors: any[];
}

export class ThemeService {
  private themes: Map<string, Theme> = new Map();
  private activeTheme: string = 'default-dark';

  registerTheme(theme: Theme) {
    this.themes.set(theme.id, theme);
  }

  async loadThemeFromFile(themePath: string) {
    const themeData = await fs.readFile(themePath, 'utf-8');
    const theme = JSON.parse(themeData);
    this.registerTheme(theme);
  }

  applyTheme(themeId: string) {
    const theme = this.themes.get(themeId);
    if (!theme) return;

    document.documentElement.style.setProperty('--background', theme.colors.background);
    document.documentElement.style.setProperty('--foreground', theme.colors.foreground);
    document.documentElement.style.setProperty('--accent', theme.colors.accent);
    
    // Apply Monaco editor theme
    monaco.editor.defineTheme(themeId, {
      base: 'vs-dark',
      inherit: true,
      rules: theme.tokenColors,
      colors: theme.colors
    });
  }
} 
interface BuildConfig {
  target: string;
  env: Record<string, string>;
  scripts: Record<string, string>;
  dependencies: string[];
}

export class BuildService {
  private configs: Map<string, BuildConfig> = new Map();
  private currentBuild: ChildProcess | null = null;

  async loadBuildConfig(projectPath: string) {
    const configPath = path.join(projectPath, 'build.config.json');
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      this.configs.set(projectPath, config);
    } catch (error) {
      console.error('Failed to load build config:', error);
    }
  }

  async build(projectPath: string, target: string = 'default') {
    const config = this.configs.get(projectPath);
    if (!config) throw new Error('No build configuration found');

    const script = config.scripts[target];
    if (!script) throw new Error(`No build script found for target: ${target}`);

    return new Promise((resolve, reject) => {
      this.currentBuild = spawn('sh', ['-c', script], {
        cwd: projectPath,
        env: { ...process.env, ...config.env }
      });

      this.currentBuild.on('close', (code) => {
        this.currentBuild = null;
        code === 0 ? resolve(null) : reject(new Error(`Build failed with code ${code}`));
      });
    });
  }
} 
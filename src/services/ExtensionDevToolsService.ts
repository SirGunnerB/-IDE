interface ExtensionProject {
  name: string;
  version: string;
  manifest: ExtensionManifest;
  sourcePath: string;
  outPath: string;
}

interface ExtensionManifest {
  name: string;
  version: string;
  main: string;
  contributes: {
    commands?: Command[];
    languages?: LanguageContribution[];
    themes?: ThemeContribution[];
  };
}

export class ExtensionDevToolsService {
  private projects: Map<string, ExtensionProject> = new Map();

  async createExtensionProject(name: string, path: string): Promise<ExtensionProject> {
    const project: ExtensionProject = {
      name,
      version: '1.0.0',
      manifest: this.createDefaultManifest(name),
      sourcePath: path,
      outPath: join(path, 'dist')
    };

    await this.scaffoldProject(project);
    this.projects.set(name, project);
    
    return project;
  }

  async debugExtension(projectName: string) {
    const project = this.projects.get(projectName);
    if (!project) throw new Error('Project not found');

    const debugSession = await this.createDebugSession(project);
    await this.startWatching(project);
    
    return debugSession;
  }

  private async scaffoldProject(project: ExtensionProject) {
    // Create project structure and files
    await this.createProjectFiles(project);
    await this.setupBuildConfig(project);
    await this.setupTestEnvironment(project);
  }
} 
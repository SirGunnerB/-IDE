interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  settings: Record<string, any>;
}

export class WorkspaceService {
  private currentWorkspace: Workspace | null = null;
  private recentWorkspaces: Workspace[] = [];

  async openWorkspace(path: string) {
    const workspaceConfig = await this.loadWorkspaceConfig(path);
    this.currentWorkspace = {
      id: crypto.randomUUID(),
      name: path.split('/').pop()!,
      rootPath: path,
      settings: workspaceConfig
    };
    
    this.updateRecentWorkspaces();
    return this.currentWorkspace;
  }

  private async loadWorkspaceConfig(path: string) {
    const configPath = join(path, '.ai-editor/workspace.json');
    try {
      const config = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(config);
    } catch {
      return this.createDefaultConfig();
    }
  }
} 
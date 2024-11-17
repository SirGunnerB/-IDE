interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  dependencies: string[];
}

interface PluginQuery {
  query?: string;
  tags?: string[];
  sort?: 'downloads' | 'rating' | 'updated';
  page?: number;
  limit?: number;
}

export class PluginMarketplaceService {
  private readonly API_ENDPOINT = 'https://plugins.aieditor.com/api';
  private installedPlugins: Map<string, Plugin> = new Map();

  async searchPlugins(query: PluginQuery): Promise<Plugin[]> {
    const response = await fetch(
      `${this.API_ENDPOINT}/plugins/search?${new URLSearchParams(query as any)}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search plugins');
    }
    
    return await response.json();
  }

  async installPlugin(pluginId: string): Promise<void> {
    const plugin = await this.fetchPluginMetadata(pluginId);
    
    // Check dependencies
    await this.checkDependencies(plugin);
    
    // Download plugin
    const packageData = await this.downloadPlugin(pluginId);
    
    // Validate package
    await this.validatePlugin(packageData);
    
    // Install plugin
    await this.extractAndInstall(packageData, plugin);
    
    this.installedPlugins.set(pluginId, plugin);
  }

  private async checkDependencies(plugin: Plugin): Promise<void> {
    for (const depId of plugin.dependencies) {
      if (!this.installedPlugins.has(depId)) {
        await this.installPlugin(depId);
      }
    }
  }
} 
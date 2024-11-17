interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  dependencies: string[];
}

interface ExtensionQuery {
  query?: string;
  tags?: string[];
  sort?: 'downloads' | 'rating' | 'updated';
  page?: number;
  limit?: number;
}

export class MarketplaceService {
  private readonly API_ENDPOINT = 'https://marketplace.aieditor.com/api';
  private installedExtensions: Map<string, Extension> = new Map();

  async searchExtensions(query: ExtensionQuery): Promise<Extension[]> {
    const response = await fetch(
      `${this.API_ENDPOINT}/extensions/search?${new URLSearchParams(query as any)}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search extensions');
    }
    
    return await response.json();
  }

  async installExtension(extensionId: string): Promise<void> {
    // Fetch extension metadata
    const extension = await this.fetchExtensionMetadata(extensionId);
    
    // Check dependencies
    await this.checkDependencies(extension);
    
    // Download extension
    const packageData = await this.downloadExtension(extensionId);
    
    // Validate package
    await this.validatePackage(packageData);
    
    // Install extension
    await this.extractAndInstall(packageData, extension);
    
    this.installedExtensions.set(extensionId, extension);
  }

  private async checkDependencies(extension: Extension): Promise<void> {
    for (const depId of extension.dependencies) {
      if (!this.installedExtensions.has(depId)) {
        await this.installExtension(depId);
      }
    }
  }
} 
interface ExtensionMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  lastUpdated: Date;
}

interface ExtensionQuery {
  query?: string;
  category?: string;
  sort?: 'downloads' | 'rating' | 'updated';
  page?: number;
  pageSize?: number;
}

export class MarketplaceAPIService {
  private readonly API_ENDPOINT = 'https://marketplace.aieditor.com/api';

  async searchExtensions(query: ExtensionQuery): Promise<ExtensionMetadata[]> {
    const response = await fetch(
      `${this.API_ENDPOINT}/extensions/search?${this.buildQueryString(query)}`
    );
    return await response.json();
  }

  async installExtension(extensionId: string): Promise<void> {
    const metadata = await this.getExtensionMetadata(extensionId);
    const packageData = await this.downloadExtension(extensionId);
    
    await this.validateExtension(packageData);
    await this.extractAndInstall(packageData, metadata);
  }

  async publishExtension(packagePath: string): Promise<void> {
    const packageData = await fs.readFile(packagePath);
    await this.validatePackage(packageData);
    
    const response = await fetch(`${this.API_ENDPOINT}/extensions/publish`, {
      method: 'POST',
      body: packageData
    });

    if (!response.ok) {
      throw new Error('Failed to publish extension');
    }
  }
} 
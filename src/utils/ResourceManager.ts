import { Resource } from '../types/Resource';

export class ResourceManager {
  private readonly resources: Map<string, Resource> = new Map();

  async acquire<T extends Resource>(
    id: string,
    factory: () => Promise<T>
  ): Promise<T> {
    if (this.resources.has(id)) {
      return this.resources.get(id) as T;
    }

    const resource = await factory();
    this.resources.set(id, resource);
    return resource;
  }

  async release(id: string): Promise<void> {
    const resource = this.resources.get(id);
    if (!resource) return;

    try {
      await resource.cleanup();
    } finally {
      this.resources.delete(id);
    }
  }

  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.resources.values()).map(
      async (resource) => {
        try {
          await resource.cleanup();
        } catch (error) {
          console.error(`Cleanup failed for resource:`, error);
        }
      }
    );

    await Promise.all(cleanupPromises);
    this.resources.clear();
  }
}
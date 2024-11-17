interface Snapshot {
  id: string;
  testName: string;
  data: any;
  hash: string;
  createdAt: number;
  updatedAt: number;
}

interface SnapshotOptions {
  updateSnapshot?: boolean;
  snapshotName?: string;
  serializer?: SnapshotSerializer;
}

export class SnapshotTestingService {
  private snapshots: Map<string, Snapshot> = new Map();
  private serializers: Map<string, SnapshotSerializer> = new Map();
  private snapshotDir: string;

  async matchSnapshot(testName: string, data: any, options: SnapshotOptions = {}): Promise<boolean> {
    const snapshotName = options.snapshotName || testName;
    const serializer = options.serializer || this.getDefaultSerializer();

    // Serialize the data
    const serialized = await serializer.serialize(data);
    const hash = this.generateHash(serialized);

    // Get existing snapshot
    const existing = await this.loadSnapshot(snapshotName);

    if (!existing) {
      if (options.updateSnapshot) {
        // Create new snapshot
        await this.saveSnapshot({
          id: crypto.randomUUID(),
          testName: snapshotName,
          data: serialized,
          hash,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        return true;
      }
      throw new Error(`No snapshot exists for test: ${snapshotName}`);
    }

    // Compare snapshots
    if (existing.hash !== hash) {
      if (options.updateSnapshot) {
        // Update existing snapshot
        await this.saveSnapshot({
          ...existing,
          data: serialized,
          hash,
          updatedAt: Date.now()
        });
        return true;
      }
      return false;
    }

    return true;
  }

  private async loadSnapshot(name: string): Promise<Snapshot | null> {
    const path = this.getSnapshotPath(name);
    try {
      const data = await fs.readFile(path, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private async saveSnapshot(snapshot: Snapshot): Promise<void> {
    const path = this.getSnapshotPath(snapshot.testName);
    await fs.mkdir(path.dirname(path), { recursive: true });
    await fs.writeFile(path, JSON.stringify(snapshot, null, 2));
  }

  private generateHash(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
} 
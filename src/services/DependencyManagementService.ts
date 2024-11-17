interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
}

interface DependencyNode {
  id: string;
  name: string;
  version: string;
  type: 'direct' | 'transitive';
  vulnerabilities: Vulnerability[];
}

export class DependencyManagementService {
  private graph: DependencyGraph = {
    nodes: new Map(),
    edges: []
  };

  async analyzeDependencies(projectPath: string): Promise<DependencyGraph> {
    const packageJson = await this.readPackageJson(projectPath);
    await this.buildDependencyGraph(packageJson);
    await this.checkVulnerabilities();
    await this.optimizeDependencies();
    
    return this.graph;
  }

  async updateDependency(name: string, version: string): Promise<void> {
    const node = this.graph.nodes.get(name);
    if (!node) throw new Error(`Dependency ${name} not found`);

    // Check compatibility
    await this.checkCompatibility(name, version);
    
    // Update package.json
    await this.updatePackageJson(name, version);
    
    // Update lock file
    await this.updateLockFile(name, version);
    
    // Rebuild dependency graph
    await this.rebuildGraph();
  }

  private async checkCompatibility(name: string, version: string): Promise<void> {
    const affectedDeps = this.findAffectedDependencies(name);
    
    for (const dep of affectedDeps) {
      const isCompatible = await this.checkDependencyCompatibility(dep, name, version);
      if (!isCompatible) {
        throw new Error(`Incompatible with ${dep.name}@${dep.version}`);
      }
    }
  }
} 
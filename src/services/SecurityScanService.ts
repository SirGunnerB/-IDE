interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    file: string;
    line: number;
  };
  recommendation: string;
}

export class SecurityScanService {
  private scanners: Map<string, SecurityScanner> = new Map();
  private vulnerabilities: SecurityVulnerability[] = [];

  async registerScanner(name: string, scanner: SecurityScanner) {
    this.scanners.set(name, scanner);
  }

  async scanProject(projectPath: string): Promise<SecurityVulnerability[]> {
    this.vulnerabilities = [];
    
    for (const scanner of this.scanners.values()) {
      const results = await scanner.scan(projectPath);
      this.vulnerabilities.push(...results);
    }

    await this.generateSecurityReport();
    return this.vulnerabilities;
  }

  private async generateSecurityReport() {
    const report = {
      timestamp: new Date(),
      vulnerabilities: this.vulnerabilities,
      summary: this.generateVulnerabilitySummary()
    };

    // Save report to file
    await fs.writeFile(
      'security-report.json',
      JSON.stringify(report, null, 2)
    );
  }
} 
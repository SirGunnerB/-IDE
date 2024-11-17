import * as path from 'path';
import * as crypto from 'crypto';

interface Test {
  id: string;
  name: string;
  filePath: string;
  fn: () => Promise<void> | void;
}

class TestDiscovery {
  private async loadTestFile(file: string): Promise<Test[]> {
    const module = await import(file);
    const tests: Test[] = [];

    if (Array.isArray(module.tests)) {
      tests.push(...module.tests);
    } else if (typeof module.default === 'function') {
      tests.push({
        id: crypto.randomUUID(),
        name: path.basename(file),
        filePath: file,
        fn: module.default
      });
    }

    return tests;
  }
}

export default TestDiscovery; 
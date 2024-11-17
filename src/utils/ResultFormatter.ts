import { TestResult } from '../types';

export class ResultFormatter {
  format(results: TestResult[]): string {
    return results
      .map(result => `${result.name}: ${result.passed ? 'PASS' : 'FAIL'}`)
      .join('\n');
  }
} 
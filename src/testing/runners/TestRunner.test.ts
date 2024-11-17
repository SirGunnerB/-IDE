import { TestRunner } from './TestRunner';
import { expect } from '../assertions/Assertion';

describe('TestRunner', () => {
  let runner: TestRunner;

  beforeEach(() => {
    runner = new TestRunner({
      parallel: false,
      coverage: false
    });
  });

  it('should run a simple test', async () => {
    const results = await runner.runSuite({
      name: 'Example Suite',
      tests: [
        {
          name: 'should pass',
          fn: async () => {
            expect(true).toBe(true);
          }
        }
      ]
    });

    expect(results.length).toBe(1);
    expect(results[0].status).toBe('passed');
  });

  it('should handle test failures', async () => {
    const results = await runner.runSuite({
      name: 'Failure Suite',
      tests: [
        {
          name: 'should fail',
          fn: async () => {
            expect(true).toBe(false);
          }
        }
      ]
    });

    expect(results.length).toBe(1);
    expect(results[0].status).toBe('failed');
  });
}); 
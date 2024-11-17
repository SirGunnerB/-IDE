interface AssertionResult {
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
  stack?: string;
}

interface AssertionOptions {
  message?: string;
  tolerance?: number;
  deep?: boolean;
}

export class TestAssertionService {
  async assert(
    condition: boolean,
    message: string = 'Assertion failed'
  ): Promise<AssertionResult> {
    return {
      passed: condition,
      message: condition ? 'Assertion passed' : message,
      stack: condition ? undefined : new Error().stack
    };
  }

  async assertEqual(
    actual: any,
    expected: any,
    options: AssertionOptions = {}
  ): Promise<AssertionResult> {
    const passed = options.deep 
      ? this.deepEqual(actual, expected)
      : actual === expected;

    return {
      passed,
      message: passed 
        ? 'Values are equal'
        : options.message || 'Values are not equal',
      expected,
      actual,
      stack: passed ? undefined : new Error().stack
    };
  }

  async assertThrows(
    fn: () => any,
    errorType?: any,
    options: AssertionOptions = {}
  ): Promise<AssertionResult> {
    try {
      await fn();
      return {
        passed: false,
        message: options.message || 'Function did not throw',
        expected: errorType?.name || 'Error',
        actual: 'No error',
        stack: new Error().stack
      };
    } catch (error) {
      const passed = !errorType || error instanceof errorType;
      return {
        passed,
        message: passed 
          ? 'Function threw expected error'
          : `Function threw wrong error type: ${error.constructor.name}`,
        expected: errorType?.name || 'Error',
        actual: error.constructor.name,
        stack: passed ? undefined : new Error().stack
      };
    }
  }
} 
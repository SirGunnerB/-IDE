import { Logger } from '../../utils/Logger';
import { diff } from 'jest-diff';
import { format } from 'util';

export class Assertion<T = any> {
  private readonly logger = new Logger('Assertion');
  private negated = false;

  constructor(private readonly actual: T) {}

  get not(): this {
    this.negated = !this.negated;
    return this;
  }

  toBe(expected: T): void {
    this.assert({
      condition: Object.is(this.actual, expected),
      message: () => `Expected ${format(this.actual)} to${this.negated ? ' not' : ''} be ${format(expected)}`,
      diffable: true,
      expected,
    });
  }

  toEqual(expected: T): void {
    this.assert({
      condition: this.deepEqual(this.actual, expected),
      message: () => `Expected ${format(this.actual)} to${this.negated ? ' not' : ''} equal ${format(expected)}`,
      diffable: true,
      expected,
    });
  }

  toBeInstanceOf(constructor: Function): void {
    this.assert({
      condition: this.actual instanceof constructor,
      message: () => `Expected ${format(this.actual)} to${this.negated ? ' not' : ''} be instance of ${constructor.name}`,
    });
  }

  toContain(item: any): void {
    this.assert({
      condition: Array.isArray(this.actual) && this.actual.includes(item),
      message: () => `Expected ${format(this.actual)} to${this.negated ? ' not' : ''} contain ${format(item)}`,
    });
  }

  toHaveProperty(property: string, value?: any): void {
    const hasProperty = property in (this.actual as object);
    const condition = value === undefined 
      ? hasProperty 
      : hasProperty && this.actual[property] === value;

    this.assert({
      condition,
      message: () => `Expected object to${this.negated ? ' not' : ''} have property '${property}'${
        value !== undefined ? ` with value ${format(value)}` : ''
      }`,
    });
  }

  toThrow(expected?: string | RegExp | Error): void {
    let error: Error | undefined;
    
    try {
      (this.actual as Function)();
    } catch (e) {
      error = e;
    }

    const condition = error !== undefined && (
      !expected ||
      (expected instanceof RegExp && expected.test(error.message)) ||
      (typeof expected === 'string' && error.message.includes(expected)) ||
      (expected instanceof Error && error.message === expected.message)
    );

    this.assert({
      condition,
      message: () => `Expected function to${this.negated ? ' not' : ''} throw${
        expected ? ` with message matching ${format(expected)}` : ''
      }`,
    });
  }

  async toResolve(): Promise<void> {
    try {
      await this.actual;
      this.assert({
        condition: true,
        message: () => 'Expected promise to reject',
      });
    } catch (error) {
      this.assert({
        condition: false,
        message: () => `Expected promise to resolve, but it rejected with ${format(error)}`,
      });
    }
  }

  async toReject(expected?: string | RegExp | Error): Promise<void> {
    try {
      await this.actual;
      this.assert({
        condition: false,
        message: () => 'Expected promise to reject',
      });
    } catch (error) {
      const condition = !expected ||
        (expected instanceof RegExp && expected.test(error.message)) ||
        (typeof expected === 'string' && error.message.includes(expected)) ||
        (expected instanceof Error && error.message === expected.message);

      this.assert({
        condition,
        message: () => `Expected promise to reject${
          expected ? ` with message matching ${format(expected)}` : ''
        }`,
      });
    }
  }

  private assert(options: AssertionOptions): void {
    const { condition, message, diffable, expected } = options;
    const shouldThrow = this.negated ? condition : !condition;

    if (shouldThrow) {
      const error = new Error(message());
      if (diffable && expected !== undefined) {
        error.message += '\n\n' + diff(expected, this.actual);
      }
      throw error;
    }
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;
    if (a === null || b === null) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => 
      keysB.includes(key) && this.deepEqual(a[key], b[key])
    );
  }
}

interface AssertionOptions {
  condition: boolean;
  message: () => string;
  diffable?: boolean;
  expected?: any;
}

export const expect = <T>(actual: T): Assertion<T> => new Assertion(actual); 
interface MockConfig {
  name: string;
  type: 'function' | 'class' | 'object';
  behavior?: MockBehavior;
  spyOn?: boolean;
}

interface MockBehavior {
  returns?: any;
  throws?: Error;
  resolves?: any;
  rejects?: Error;
  implementation?: (...args: any[]) => any;
}

export class TestMockingService {
  private mocks: Map<string, Mock> = new Map();
  private spies: Map<string, MockSpy> = new Map();

  createMock<T>(config: MockConfig): T {
    const mock = this.buildMock(config);
    this.mocks.set(config.name, mock);

    if (config.spyOn) {
      const spy = this.createSpy(mock);
      this.spies.set(config.name, spy);
    }

    return mock as T;
  }

  private buildMock(config: MockConfig): Mock {
    switch (config.type) {
      case 'function':
        return this.createFunctionMock(config);
      case 'class':
        return this.createClassMock(config);
      case 'object':
        return this.createObjectMock(config);
      default:
        throw new Error(`Unsupported mock type: ${config.type}`);
    }
  }

  private createFunctionMock(config: MockConfig): Mock {
    const mockFn = (...args: any[]) => {
      if (config.behavior?.throws) {
        throw config.behavior.throws;
      }

      if (config.behavior?.implementation) {
        return config.behavior.implementation(...args);
      }

      if (config.behavior?.resolves) {
        return Promise.resolve(config.behavior.resolves);
      }

      if (config.behavior?.rejects) {
        return Promise.reject(config.behavior.rejects);
      }

      return config.behavior?.returns;
    };

    return mockFn;
  }

  verifyMock(name: string, expectations: MockExpectation): boolean {
    const spy = this.spies.get(name);
    if (!spy) throw new Error(`No spy found for mock: ${name}`);

    return this.verifyExpectations(spy, expectations);
  }

  private verifyExpectations(spy: MockSpy, expectations: MockExpectation): boolean {
    if (expectations.called) {
      return spy.calls.length > 0;
    }

    if (expectations.calledTimes !== undefined) {
      return spy.calls.length === expectations.calledTimes;
    }

    if (expectations.calledWith) {
      return spy.calls.some(call => 
        this.arrayEquals(call.args, expectations.calledWith)
      );
    }

    return true;
  }
} 
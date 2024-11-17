import { Logger } from '../../utils/Logger';

export class MockFactory {
  private readonly logger = new Logger('MockFactory');
  private readonly mocks = new Map<string, jest.Mock>();
  private readonly spies = new Map<string, jest.SpyInstance>();

  createMock<T extends object>(
    name: string,
    implementation?: (...args: any[]) => any
  ): jest.Mock<T> {
    const mock = jest.fn(implementation);
    this.mocks.set(name, mock);
    return mock;
  }

  createSpy<T extends object>(
    object: T,
    method: keyof T,
    implementation?: (...args: any[]) => any
  ): jest.SpyInstance {
    const spy = jest.spyOn(object, method as any);
    if (implementation) {
      spy.mockImplementation(implementation);
    }
    this.spies.set(`${object.constructor.name}.${String(method)}`, spy);
    return spy;
  }

  getMock(name: string): jest.Mock | undefined {
    return this.mocks.get(name);
  }

  getSpy(name: string): jest.SpyInstance | undefined {
    return this.spies.get(name);
  }

  resetAll(): void {
    this.mocks.forEach(mock => mock.mockReset());
    this.spies.forEach(spy => spy.mockReset());
  }

  clearAll(): void {
    this.mocks.forEach(mock => mock.mockClear());
    this.spies.forEach(spy => spy.mockClear());
  }

  restoreAll(): void {
    this.spies.forEach(spy => spy.mockRestore());
    this.mocks.clear();
    this.spies.clear();
  }
}

export class MockHttpClient {
  private responses = new Map<string, any>();
  private errors = new Map<string, Error>();

  setResponse(path: string, response: any): void {
    this.responses.set(path, response);
  }

  setError(path: string, error: Error): void {
    this.errors.set(path, error);
  }

  async get(path: string): Promise<any> {
    if (this.errors.has(path)) {
      throw this.errors.get(path)!;
    }
    return this.responses.get(path);
  }

  async post(path: string, data: any): Promise<any> {
    if (this.errors.has(path)) {
      throw this.errors.get(path)!;
    }
    return this.responses.get(path);
  }

  clear(): void {
    this.responses.clear();
    this.errors.clear();
  }
}

export class MockDatabase {
  private data = new Map<string, any[]>();
  private queryLog: string[] = [];

  setCollection(name: string, data: any[]): void {
    this.data.set(name, [...data]);
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    this.queryLog.push(sql);
    const collectionName = this.extractCollectionName(sql);
    const collection = this.data.get(collectionName) || [];
    
    if (sql.toLowerCase().includes('select')) {
      return this.handleSelect(collection, sql, params);
    }
    
    return [];
  }

  private extractCollectionName(sql: string): string {
    const match = sql.match(/from\s+(\w+)/i);
    return match ? match[1] : '';
  }

  private handleSelect(collection: any[], sql: string, params: any[]): any[] {
    // Simple implementation - extend based on needs
    return collection;
  }

  getQueryLog(): string[] {
    return [...this.queryLog];
  }

  clear(): void {
    this.data.clear();
    this.queryLog = [];
  }
} 
interface TestFixture {
  id: string;
  name: string;
  setup: () => Promise<any>;
  teardown: () => Promise<void>;
  data: any;
}

interface FixtureContext {
  id: string;
  fixtures: Map<string, any>;
  cleanupFns: (() => Promise<void>)[];
}

export class TestFixtureService {
  private fixtures: Map<string, TestFixture> = new Map();
  private contexts: Map<string, FixtureContext> = new Map();
  private database: TestDatabase;

  async createFixture(name: string, setup: () => Promise<any>, teardown: () => Promise<void>): Promise<string> {
    const fixture: TestFixture = {
      id: crypto.randomUUID(),
      name,
      setup,
      teardown,
      data: null
    };

    this.fixtures.set(fixture.id, fixture);
    return fixture.id;
  }

  async setupTestContext(testId: string, fixtureIds: string[]): Promise<FixtureContext> {
    const context: FixtureContext = {
      id: testId,
      fixtures: new Map(),
      cleanupFns: []
    };

    try {
      // Setup fixtures in order
      for (const fixtureId of fixtureIds) {
        const fixture = this.fixtures.get(fixtureId);
        if (!fixture) {
          throw new Error(`Fixture not found: ${fixtureId}`);
        }

        // Setup fixture
        const data = await fixture.setup();
        context.fixtures.set(fixtureId, data);
        context.cleanupFns.push(() => fixture.teardown());
      }

      this.contexts.set(testId, context);
      return context;
    } catch (error) {
      // Clean up any fixtures that were successfully set up
      await this.teardownContext(context);
      throw error;
    }
  }

  async teardownContext(context: FixtureContext): Promise<void> {
    // Execute cleanup functions in reverse order
    for (const cleanup of context.cleanupFns.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        console.error('Error during fixture teardown:', error);
      }
    }

    this.contexts.delete(context.id);
  }

  async getFixtureData(contextId: string, fixtureId: string): Promise<any> {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    const data = context.fixtures.get(fixtureId);
    if (data === undefined) {
      throw new Error(`Fixture data not found: ${fixtureId}`);
    }

    return data;
  }
} 
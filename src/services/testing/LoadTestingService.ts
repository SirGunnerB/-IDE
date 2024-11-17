interface LoadTest {
  name: string;
  endpoint: string;
  method: HttpMethod;
  virtualUsers: number;
  duration: number;
  rampUp?: number;
  thresholds: LoadTestThresholds;
  scenarios: LoadScenario[];
}

interface LoadTestThresholds {
  responseTime: {
    p95: number;
    p99: number;
  };
  errorRate: number;
  requestsPerSecond: number;
}

export class LoadTestingService {
  private workers: LoadTestWorker[] = [];
  private metrics: MetricsCollector;
  private reporter: LoadTestReporter;

  async runLoadTest(test: LoadTest): Promise<LoadTestResult> {
    const context = await this.createTestContext(test);

    try {
      // Initialize metrics collection
      await this.metrics.initialize(test);

      // Create virtual users
      await this.createVirtualUsers(test, context);

      // Start load test
      const startTime = Date.now();
      await this.executeLoadTest(test, context);

      // Collect and analyze results
      const results = await this.collectResults(test, startTime);

      // Validate against thresholds
      await this.validateThresholds(results, test.thresholds);

      return results;
    } finally {
      await this.cleanup(context);
    }
  }

  private async createVirtualUsers(test: LoadTest, context: TestContext): Promise<void> {
    const usersPerWorker = Math.ceil(test.virtualUsers / this.workers.length);

    for (let i = 0; i < this.workers.length; i++) {
      const worker = this.workers[i];
      const startUser = i * usersPerWorker;
      const endUser = Math.min(startUser + usersPerWorker, test.virtualUsers);

      await worker.initialize({
        ...test,
        virtualUsers: endUser - startUser,
        startIndex: startUser
      });
    }
  }

  private async executeLoadTest(test: LoadTest, context: TestContext): Promise<void> {
    // Handle ramp-up period if specified
    if (test.rampUp) {
      await this.handleRampUp(test, context);
    }

    // Execute scenarios
    const scenarioPromises = test.scenarios.map(scenario =>
      this.executeScenario(scenario, context)
    );

    // Wait for duration or scenario completion
    await Promise.race([
      Promise.all(scenarioPromises),
      this.createDurationPromise(test.duration)
    ]);
  }

  private async handleRampUp(test: LoadTest, context: TestContext): Promise<void> {
    const rampUpInterval = test.rampUp / test.virtualUsers;
    let activeUsers = 0;

    while (activeUsers < test.virtualUsers) {
      await this.startVirtualUser(context);
      activeUsers++;
      await new Promise(resolve => setTimeout(resolve, rampUpInterval));
    }
  }

  private async collectResults(test: LoadTest, startTime: number): Promise<LoadTestResult> {
    const metrics = await this.metrics.collect();

    return {
      name: test.name,
      duration: Date.now() - startTime,
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      responseTime: {
        mean: metrics.meanResponseTime,
        p95: metrics.p95ResponseTime,
        p99: metrics.p99ResponseTime
      },
      requestsPerSecond: metrics.requestsPerSecond,
      errorRate: metrics.errorRate,
      scenarios: metrics.scenarioMetrics
    };
  }
} 
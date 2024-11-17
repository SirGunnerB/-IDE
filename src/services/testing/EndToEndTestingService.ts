interface E2ETest {
  name: string;
  description: string;
  flows: TestFlow[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  retries?: number;
}

interface TestFlow {
  name: string;
  steps: TestStep[];
  assertions: FlowAssertion[];
  cleanup?: () => Promise<void>;
}

export class EndToEndTestingService {
  private browser: Browser;
  private recorder: TestRecorder;
  private storage: TestDataStorage;
  private reporter: E2EReporter;

  async runE2ETest(test: E2ETest): Promise<E2ETestResult> {
    const context = await this.createTestContext(test);
    let currentRetry = 0;

    while (currentRetry <= (test.retries || 0)) {
      try {
        // Setup test environment
        await test.setup?.();

        // Execute test flows
        const flowResults = await this.executeTestFlows(test.flows, context);

        // Validate end-to-end state
        await this.validateEndState(test, flowResults);

        return this.createSuccessResult(test, flowResults);
      } catch (error) {
        if (currentRetry === test.retries) {
          return this.createFailureResult(test, error, currentRetry);
        }
        currentRetry++;
        await this.handleRetry(test, error, currentRetry);
      } finally {
        await test.teardown?.();
      }
    }
  }

  private async executeTestFlows(
    flows: TestFlow[],
    context: TestContext
  ): Promise<FlowResult[]> {
    const results: FlowResult[] = [];

    for (const flow of flows) {
      try {
        // Start recording flow
        await this.recorder.startFlow(flow.name);

        // Execute flow steps
        const stepResults = await this.executeFlowSteps(flow.steps, context);

        // Validate flow assertions
        await this.validateFlowAssertions(flow.assertions, context);

        results.push({
          flow: flow.name,
          status: 'passed',
          steps: stepResults
        });
      } catch (error) {
        results.push({
          flow: flow.name,
          status: 'failed',
          error: error.message
        });
        throw error;
      } finally {
        await flow.cleanup?.();
        await this.recorder.stopFlow();
      }
    }

    return results;
  }

  private async executeFlowSteps(
    steps: TestStep[],
    context: TestContext
  ): Promise<StepResult[]> {
    const results: StepResult[] = [];

    for (const step of steps) {
      try {
        await this.recorder.startStep(step.name);
        
        // Execute step action
        await this.executeStepAction(step, context);
        
        // Wait for any animations/transitions
        await this.waitForStability();
        
        // Verify step completion
        await this.verifyStepCompletion(step, context);

        results.push({
          step: step.name,
          status: 'passed',
          duration: this.recorder.getCurrentStepDuration()
        });
      } catch (error) {
        results.push({
          step: step.name,
          status: 'failed',
          error: error.message,
          screenshot: await this.captureFailureScreenshot(context)
        });
        throw error;
      } finally {
        await this.recorder.stopStep();
      }
    }

    return results;
  }

  private async validateFlowAssertions(
    assertions: FlowAssertion[],
    context: TestContext
  ): Promise<void> {
    for (const assertion of assertions) {
      try {
        await assertion.validate(context);
      } catch (error) {
        throw new Error(`Assertion failed: ${assertion.name} - ${error.message}`);
      }
    }
  }
} 
interface VisualTest {
  name: string;
  url: string;
  selectors: string[];
  viewports: Viewport[];
  threshold: number;
  ignoreRegions?: Region[];
}

interface VisualComparison {
  baseline: Screenshot;
  current: Screenshot;
  diff?: ImageDiff;
  matches: boolean;
  score: number;
}

export class VisualRegressionService {
  private browser: Browser;
  private storage: ScreenshotStorage;
  private comparator: ImageComparator;

  async runVisualTest(test: VisualTest): Promise<VisualTestResult> {
    const page = await this.browser.newPage();

    try {
      // Take screenshots for each viewport
      const screenshots = await this.captureScreenshots(page, test);

      // Compare with baseline
      const comparisons = await this.compareWithBaseline(test, screenshots);

      // Analyze differences
      const analysis = await this.analyzeDifferences(comparisons, test.threshold);

      return {
        name: test.name,
        url: test.url,
        comparisons,
        analysis,
        passed: analysis.maxDifference <= test.threshold
      };
    } finally {
      await page.close();
    }
  }

  private async captureScreenshots(
    page: Page,
    test: VisualTest
  ): Promise<Map<string, Screenshot>> {
    const screenshots = new Map();

    for (const viewport of test.viewports) {
      await page.setViewport(viewport);
      await page.goto(test.url);
      await page.waitForNetworkIdle();

      for (const selector of test.selectors) {
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }

        const screenshot = await this.captureElementScreenshot(element, test.ignoreRegions);
        screenshots.set(`${viewport.width}x${viewport.height}-${selector}`, screenshot);
      }
    }

    return screenshots;
  }

  private async compareWithBaseline(
    test: VisualTest,
    screenshots: Map<string, Screenshot>
  ): Promise<Map<string, VisualComparison>> {
    const comparisons = new Map();

    for (const [key, screenshot] of screenshots.entries()) {
      const baseline = await this.storage.getBaseline(test.name, key);
      
      if (!baseline) {
        await this.storage.saveBaseline(test.name, key, screenshot);
        comparisons.set(key, { baseline: screenshot, current: screenshot, matches: true, score: 1 });
        continue;
      }

      const diff = await this.comparator.compare(baseline, screenshot);
      comparisons.set(key, {
        baseline,
        current: screenshot,
        diff,
        matches: diff.score <= test.threshold,
        score: diff.score
      });
    }

    return comparisons;
  }
} 
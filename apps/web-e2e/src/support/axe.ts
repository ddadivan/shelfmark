import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { AXE_BLOCKING_IMPACTS } from '../models/axe-blocking-impacts.const';
import { AXE_TAGS } from '../models/axe-tags.const';

const REPORT_NAME = 'axe-results';
const REPORT_TYPE = 'application/json';

/**
 * Scans the current page against WCAG 2.2 AA, attaches the full result and fails on
 * serious or critical violations only.
 */
export async function expectNoBlockingViolations(page: Page, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  await testInfo.attach(REPORT_NAME, {
    body: JSON.stringify(results, null, 2),
    contentType: REPORT_TYPE,
  });

  const blocking = results.violations
    .filter((violation) => AXE_BLOCKING_IMPACTS.some((impact) => impact === violation.impact))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }));
  expect(blocking).toEqual([]);
}

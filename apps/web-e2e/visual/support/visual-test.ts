import { type Page } from '@playwright/test';
import { expect, test as base } from '../../src/support/test';
import { settled } from '../../src/support/settled';

/** "Today" of every visual test: relative dates ("3 days ago", Trash retention) never move. */
export const FROZEN_NOW = new Date('2026-06-15T10:00:00Z');

/**
 * `test` with the clock frozen before the first navigation (`Date.now()` and `new Date()` stay
 * fixed, timers still run so the app starts normally) and the monitoring stub of the e2e suite.
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    // Browser errors and failed requests are printed when a test fails: in CI the only trace of
    // why a screen did not render (the job's artifacts hold the PNGs, not the console).
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        problems.push(`console: ${message.text()}`);
      }
    });
    page.on('requestfailed', (request) =>
      problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`),
    );
    await page.clock.setFixedTime(FROZEN_NOW);
    await use(page);
    if (testInfo.status !== testInfo.expectedStatus && problems.length > 0) {
      console.log(`[${testInfo.project.name}] ${testInfo.title}\n  ${problems.join('\n  ')}`);
    }
  },
});

export { expect };

/**
 * Takes the baseline comparison of the viewport: waits for the network to go idle, fonts and running animations, two
 * frames for layout and moves the pointer away so no hover state is captured. Animations are
 * also disabled by Playwright and by the project's `reducedMotion`.
 */
export async function expectScreen(page: Page, name: string): Promise<void> {
  // The icon sprite, fonts and idle-loaded parts are fetched after the first paint; under CPU
  // load that can take longer than the screenshot's own two-equal-frames check waits for.
  // eslint-disable-next-line playwright/no-networkidle -- a settle point for a screenshot, not a readiness check of a flow
  await page.waitForLoadState('networkidle');
  await iconsDrawn(page);
  await settled(page);
  await page.mouse.move(0, 0);
  await page.evaluate(
    'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
  );
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  });
}

/**
 * Waits until every icon has its shape: an `<svg><use href="sprite.svg#id">` of an element added
 * after the first paint is drawn a moment after it is in the DOM, and under CPU load a shot
 * taken in between has empty icon slots (and stays empty for the retries of `toHaveScreenshot`).
 */
async function iconsDrawn(page: Page): Promise<void> {
  await page.waitForFunction(
    `Array.from(document.querySelectorAll('ui-icon svg use')).every((use) => {
      const box = use.getBoundingClientRect();
      return box.width > 0 || box.height > 0;
    })`,
  );
}

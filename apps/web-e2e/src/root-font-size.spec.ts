import { type Page } from '@playwright/test';
import { expect, test } from './support/test';

// Root font size by viewport width (#352): 100% below 2560 CSS px, then 112.5% / 125% / 150% / 200%.
const STEPS: readonly { width: number; fontSize: string }[] = [
  { width: 1440, fontSize: '16px' },
  { width: 2559, fontSize: '16px' },
  { width: 2560, fontSize: '18px' },
  { width: 3200, fontSize: '20px' },
  { width: 3840, fontSize: '24px' },
  { width: 5120, fontSize: '32px' },
];

const rootFontSize = (page: Page): Promise<string> =>
  page.evaluate(() => getComputedStyle(document.documentElement).fontSize);

test.describe('root font size on wide viewports', () => {
  test.skip(({ isMobile }) => isMobile, 'wide viewports are a desktop matter');

  for (const { width, fontSize } of STEPS) {
    test(`is ${fontSize} at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto('/sign-in');
      await expect.poll(() => rootFontSize(page)).toBe(fontSize);
    });
  }

  test('the text size setting multiplies on top of the base', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 1080 });
    await page.goto('/sign-in');
    await page.evaluate(() => document.documentElement.setAttribute('data-text-size', 'l'));
    // 150% of 16px, times 1.125.
    await expect.poll(() => rootFontSize(page)).toBe('27px');
    await page.evaluate(() => document.documentElement.setAttribute('data-text-size', 's'));
    await expect.poll(() => rootFontSize(page)).toBe('21.6px');
  });
});

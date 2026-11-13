import { type Page } from '@playwright/test';
import { seedSession } from './support/mock-session';
import { expect, test } from './support/test';

// Root font size by viewport width (#352). The app: 100% below 3200 CSS px, then 112.5% / 145% / 175%
// (author's values; the text size setting covers anyone who wants more). Landing and sign-in have
// their own steps (apps/web/src/styles.scss) from 2560 px: landing 112.5% / 125% / 160% / 230%,
// sign-in 112.5% / 125% / 180% / 230% (author's values).
const APP_STEPS: readonly { width: number; fontSize: string }[] = [
  { width: 1440, fontSize: '16px' },
  { width: 2560, fontSize: '16px' },
  { width: 3199, fontSize: '16px' },
  { width: 3200, fontSize: '18px' },
  { width: 3840, fontSize: '23.2px' },
  { width: 5120, fontSize: '28px' },
];

const PUBLIC_STEPS = (at4k: string): typeof APP_STEPS => [
  { width: 1440, fontSize: '16px' },
  { width: 2559, fontSize: '16px' },
  { width: 2560, fontSize: '18px' },
  { width: 3200, fontSize: '20px' },
  { width: 3840, fontSize: at4k },
  { width: 5120, fontSize: '36.8px' },
];

const PUBLIC_PAGES: readonly { path: string; host: string; steps: typeof APP_STEPS }[] = [
  { path: '/', host: 'app-landing-page', steps: PUBLIC_STEPS('25.6px') },
  { path: '/sign-in', host: 'app-sign-in-page', steps: PUBLIC_STEPS('28.8px') },
];

const rootFontSize = (page: Page): Promise<string> =>
  page.evaluate<string>('getComputedStyle(document.documentElement).fontSize');

const setTextSize = (page: Page, size: string): Promise<void> =>
  page.locator('html').evaluate((el, value) => el.setAttribute('data-text-size', value), size);

async function openApp(page: Page, width: number): Promise<void> {
  await seedSession(page);
  await page.setViewportSize({ width, height: 1080 });
  await page.goto('/library');
  await expect(page.locator('app-shell')).toBeAttached();
}

test.describe('root font size on wide viewports', () => {
  test.skip(({ isMobile }) => isMobile, 'wide viewports are a desktop matter');

  // One test per page walks its widths (#349): the same checks, one page load each.
  test('the app steps its root font size with the width', async ({ page }) => {
    await openApp(page, APP_STEPS[0].width);
    for (const { width, fontSize } of APP_STEPS) {
      await page.setViewportSize({ width, height: 1080 });
      await expect.poll(() => rootFontSize(page), { message: `at ${width}px` }).toBe(fontSize);
    }
  });

  for (const { path, host, steps } of PUBLIC_PAGES) {
    test(`${host} steps its root font size with the width`, async ({ page }) => {
      await page.setViewportSize({ width: steps[0].width, height: 1080 });
      await page.goto(path);
      await expect(page.locator(host)).toBeAttached();
      for (const { width, fontSize } of steps) {
        await page.setViewportSize({ width, height: 1080 });
        await expect.poll(() => rootFontSize(page), { message: `at ${width}px` }).toBe(fontSize);
      }
    });
  }

  test('the text size setting multiplies on top of the base', async ({ page }) => {
    await openApp(page, 3840);
    await setTextSize(page, 'l');
    // 145% of 16px, times 1.125.
    await expect.poll(() => rootFontSize(page)).toBe('26.1px');
    await setTextSize(page, 's');
    await expect.poll(() => rootFontSize(page)).toBe('20.88px');
  });
});

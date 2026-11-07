import { expect, test } from '@playwright/test';

const HEADLINE = 'Paste a link. Find it again. Even in a year.';

test.describe('smoke', () => {
  test('landing page renders, themed, zoneless, without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
    expect(await page.evaluate(() => 'Zone' in globalThis)).toBe(false);
    expect(errors).toEqual([]);
  });
});

test.describe('responsive layout', () => {
  test('has no horizontal scroll at 360px width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );

    expect(overflow).toBeLessThanOrEqual(0);
  });
});

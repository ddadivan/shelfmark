import { expect, test } from './support/test';
import { LANDING_HEADLINE } from './models/landing-headline.const';

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

    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
    expect(await page.evaluate(() => 'Zone' in globalThis)).toBe(false);
    expect(errors).toEqual([]);
  });
});

test.describe('responsive layout', () => {
  test('has no horizontal scroll at 360px width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );

    expect(overflow).toBeLessThanOrEqual(0);
  });
});

import { LANDING_HEADLINE } from '../src/models/landing-headline.const';
import { expect, expectScreen, test } from './support/visual-test';

test.describe('visual: public pages', () => {
  test('landing, above the fold', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeInViewport();
    // The sections below the hero load on idle timers; they are not in the first screen.
    await expect(page.locator('.landing-hero')).toBeVisible();

    await expectScreen(page, 'landing');
  });

  test('sign-in', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(
      page.getByRole('heading', { level: 1, name: 'All your links on one shelf' }),
    ).toBeVisible();

    // The art is an idle-loaded `@defer` block: the mosaic (tablet, phone) or the drift (desktop).
    await expect(page.locator('app-sign-in-mosaic, app-sign-in-drift').first()).toBeAttached();

    await expectScreen(page, 'sign-in');
  });
});

import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { gotoLandingLoaded } from './support/landing';

const TITLE = 'Privacy policy';

test.describe('privacy policy', () => {
  test('a guest opens /privacy directly, without being sent to sign-in', async ({ page }) => {
    const response = await page.goto('/privacy');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
    await expect(page.getByText('Last updated 13 November 2026')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Contact' })).toBeVisible();
  });

  test('a signed-in user can open it too', async ({ page }) => {
    await seedSession(page);
    await page.goto('/privacy');

    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  });

  test('is linked from the sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('link', { name: TITLE }).click();

    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  });

  test('is linked from the landing footer', async ({ page }) => {
    await gotoLandingLoaded(page);
    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click();

    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  });

  test('has no horizontal scroll at 360px width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );

    expect(overflow).toBeLessThanOrEqual(0);
  });
});

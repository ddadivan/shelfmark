import { expect, test } from '@playwright/test';
import { MOCK_USER, openAccountMenu, seedSession } from './support/mock-session';

test.describe('settings (mock auth)', () => {
  test('a guest on /settings lands on sign-in and returns after signing in', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fsettings$/);
    await page.getByRole('button', { name: 'Continue with GitHub' }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  });

  test('a signed-in user opens settings from the account menu and sees the account', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/links');

    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Settings' }).click();

    await expect(page).toHaveURL(/\/settings$/);
    const main = page.getByRole('main');
    await expect(main.getByText(MOCK_USER.name, { exact: true })).toBeVisible();
    await expect(main.getByText(MOCK_USER.email)).toBeVisible();
  });

  test('the theme choice applies at once and survives a reload', async ({ page }) => {
    await seedSession(page);
    await page.goto('/settings');
    const html = page.locator('html');

    await page.getByRole('radio', { name: 'Dark' }).check({ force: true });
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.reload();

    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();

    await page.getByRole('radio', { name: 'Light' }).check({ force: true });
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('settings fit a 360px phone without horizontal scroll', async ({ page }) => {
    await seedSession(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/settings');

    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

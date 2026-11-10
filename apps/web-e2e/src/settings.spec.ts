import { expect, test } from './support/test';
import {
  dismissOnboarding,
  MOCK_USER,
  openSettingsPage,
  seedSession,
} from './support/mock-session';

test.describe('settings (mock auth)', () => {
  test('a guest on /settings lands on sign-in and returns after signing in', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fsettings$/);
    await page.getByRole('button', { name: 'Continue with GitHub' }).click();

    await dismissOnboarding(page);
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { level: 1, name: /^(Settings|You)$/ })).toBeVisible();
  });

  test('a signed-in user opens settings from the account menu and sees the account', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/links');

    await openSettingsPage(page);

    await expect(page).toHaveURL(/\/settings$/);
    const main = page.getByRole('main');
    await expect(main.getByText(MOCK_USER.name, { exact: true })).toBeVisible();
    await expect(main.getByText(MOCK_USER.email)).toBeVisible();
  });

  test('the sections are grouped with their own padding, "Welcome tour" shows once', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/settings');
    const main = page.getByRole('main');

    await expect(
      main.getByRole('heading', { level: 2, name: /^(Appearance|Your data|Welcome tour)$/ }),
    ).toHaveCount(3);
    await expect(main.getByText('Welcome tour', { exact: true })).toHaveCount(1);
    await expect(main.getByText('More languages are coming')).toBeVisible();
    await expect(main.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    await expect(main.getByText('Shelfmark v1.0')).toBeVisible();
    const section = main
      .locator('ui-settings-section')
      .filter({ hasText: 'Appearance' })
      .locator('ui-panel');
    await expect(section).not.toHaveCSS('padding-left', '0px');
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

    await expect(page.getByRole('heading', { level: 1, name: /^(Settings|You)$/ })).toBeVisible();
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

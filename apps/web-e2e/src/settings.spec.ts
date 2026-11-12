import { expect, test } from './support/test';
import {
  dismissOnboarding,
  MOCK_USER,
  openSettingsPage,
  openSettingsSection,
  seedSession,
} from './support/mock-session';
import { isPhone } from './support/sidebar';

/** What `/settings` shows: the You list on a phone, the first section (Account) elsewhere. */
const LANDING_HEADING = /^(Account|You)$/;

test.describe('settings (mock auth)', () => {
  test('a guest on /settings lands on sign-in and returns after signing in', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fsettings$/);
    await page.getByRole('button', { name: 'Continue with GitHub' }).click();

    await dismissOnboarding(page);
    await expect(page).toHaveURL(isPhone(page) ? /\/settings$/ : /\/settings\/account$/);
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADING })).toBeVisible();
  });

  test('a guest on a settings page returns to that page after signing in', async ({ page }) => {
    await page.goto('/settings/appearance');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fsettings%2Fappearance$/);
    await page.getByRole('button', { name: 'Continue with GitHub' }).click();

    await dismissOnboarding(page);
    await expect(page).toHaveURL(/\/settings\/appearance$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();
  });

  test('a signed-in user opens settings from the account menu and sees the account', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/links');

    await openSettingsSection(page, 'Account');

    await expect(page).toHaveURL(/\/settings\/account$/);
    const main = page.getByRole('main');
    await expect(main.getByText(MOCK_USER.name, { exact: true })).toBeVisible();
    await expect(main.getByText(MOCK_USER.email)).toBeVisible();
  });

  test('the account page groups profile, sign out, welcome tour and the danger section', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/settings/account');
    const main = page.getByRole('main');

    await expect(
      main.getByRole('heading', {
        level: 2,
        name: /^(Profile|Sign out|Welcome tour|Delete account)$/,
      }),
    ).toHaveCount(4);
    await expect(main.getByText('Welcome tour', { exact: true })).toHaveCount(1);
    const section = main
      .locator('ui-settings-section')
      .filter({ hasText: 'Welcome tour' })
      .locator('ui-panel');
    await expect(section).not.toHaveCSS('padding-left', '0px');
  });

  test('appearance has no language row (#315), privacy the policy link', async ({ page }) => {
    await seedSession(page);
    await page.goto('/settings/appearance');
    const main = page.getByRole('main');

    await expect(main.getByRole('heading', { level: 2, name: 'Theme' })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Change language' })).toHaveCount(0);

    await openSettingsSection(page, 'Privacy and data');
    await expect(page).toHaveURL(/\/settings\/privacy$/);
    await expect(main.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  test('the desktop nav lists the sections and marks the open one', async ({ page }) => {
    test.skip(isPhone(page), 'the phone has the You list instead of the nav');
    await seedSession(page);
    await page.goto('/settings');
    const nav = page.getByRole('navigation', { name: 'Settings' });

    await expect(page).toHaveURL(/\/settings\/account$/);
    await expect(nav.getByRole('link')).toHaveText([
      'Back to links',
      'Account',
      'Appearance',
      'Library',
      'Language',
      'Keyboard shortcuts',
      'Export',
      'Privacy and data',
      'Your feedback',
    ]);
    await expect(nav.getByRole('link', { name: 'Account' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.getByText('Shelfmark v1.0')).toBeVisible();

    await nav.getByRole('link', { name: 'Keyboard shortcuts' }).click();

    await expect(page).toHaveURL(/\/settings\/shortcuts$/);
    await expect(nav.getByRole('link', { name: 'Keyboard shortcuts' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.getByRole('link', { name: 'Account' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );

    await nav.getByRole('link', { name: 'Back to links' }).click();

    await expect(page).toHaveURL(/\/links$/);
  });

  test('the phone lists the sections in the You tab, each opens a page with a way back', async ({
    page,
  }) => {
    test.skip(!isPhone(page), 'tablet and desktop have the nav instead of the list');
    await seedSession(page);
    await page.goto('/links');

    await openSettingsPage(page);

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Appearance' })).toContainText('System');
    await expect(page.getByRole('link', { name: 'Keyboard shortcuts' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Appearance' }).click();

    await expect(page).toHaveURL(/\/settings\/appearance$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();

    await page.getByRole('link', { name: 'You' }).first().click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    await expect(page.getByText('Shelfmark v1.0')).toBeVisible();
  });

  test('the theme choice applies at once and survives a reload', async ({ page }) => {
    await seedSession(page);
    await page.goto('/settings/appearance');
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

    for (const path of ['/settings', ...SECTION_PATHS]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate<number>(
        '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

const SECTION_PATHS = [
  '/settings/account',
  '/settings/appearance',
  '/settings/shortcuts',
  '/settings/import-export',
  '/settings/privacy',
];

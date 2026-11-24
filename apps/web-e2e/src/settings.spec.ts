import { expect, test } from './support/test';
import {
  dismissOnboarding,
  MOCK_USER,
  openSettingsPage,
  openSettingsSection,
  seedSession,
} from './support/mock-session';
import { isCompact, isPhone } from './support/sidebar';
import { E2E_TAG } from './models/e2e-tag.const';

test.describe('settings (mock auth)', () => {
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

  test(
    'the mobile shell lists the sections on You, each opens a page with a way back',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      test.skip(!isCompact(page), 'tablet and desktop have the nav instead of the list');
      await seedSession(page);
      await page.goto('/links');

      await openSettingsPage(page);

      await expect(page).toHaveURL(/\/settings$/);
      await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible();
      // The You list (a tablet also shows the section chips above it, Shelf block 5).
      const row = page
        .locator('app-settings-index-page')
        .getByRole('link', { name: /^Appearance/ });
      await expect(row).toContainText('System');
      await expect(page.getByRole('link', { name: 'Keyboard shortcuts' })).toHaveCount(0);

      await row.click();

      await expect(page).toHaveURL(/\/settings\/appearance$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();

      if (isPhone(page)) {
        await page.getByRole('link', { name: 'Back to You' }).click();
      } else {
        // Between the phone and 64em the sections are a chip row; Back returns to You.
        await expect(
          page
            .getByRole('navigation', { name: 'Settings' })
            .getByRole('link', { name: 'Appearance' }),
        ).toHaveAttribute('aria-current', 'page');
        await page.goBack();
      }

      await expect(page).toHaveURL(/\/settings$/);
      await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
        'href',
        '/privacy',
      );
      await expect(page.getByText(/^Shelfmark \d+\.\d+\.\d+/)).toBeVisible();
    },
  );

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
  '/settings/privacy',
];

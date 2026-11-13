import { type Page } from '@playwright/test';
import { MOCK_LINKS_SCENARIO } from './models/mock-links-scenario.const';
import { demoUser, MOCK_USER, openAccountMenu, seedSession } from './support/mock-session';
import {
  BROKEN_AVATAR_PATH,
  routeSampleAvatars,
  SAMPLE_AVATAR_PATH,
} from './support/sample-avatar';
import { isCompact, tabBar } from './support/sidebar';
import { expect, test } from './support/test';

/** Whether the avatar image inside `scope` has loaded (a decoded picture, not the initials). */
async function photoLoaded(page: Page, selector: string): Promise<boolean> {
  return page.evaluate<boolean>(
    `(() => { const img = document.querySelector(${JSON.stringify(selector)});
      return !!img && img.complete && img.naturalWidth > 0; })()`,
  );
}

// #352: the richer Account page — the provider photo, "Your shelf", connected accounts and
// "Your data" (export moved here from its own Settings section).
test.describe('account page (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  // The production build registers the Angular service worker. Once it controls the page,
  // image requests go through it and bypass `page.route`, so the sample avatar 404s on the
  // second page (seen in CI on the You page). Block it here: these tests are about the photo.
  test.use({ serviceWorkers: 'block' });

  test('shows the shelf: counts, top sites, top tags, 12 weeks, member since', async ({ page }) => {
    await seedSession(page);
    await page.goto('/settings/account');

    const shelf = page.locator('app-account-shelf');
    await expect(shelf.locator('.shelf__count')).toHaveCount(3);
    await expect(shelf.locator('.shelf__count').first()).toContainText('Links');
    await expect(shelf.getByRole('heading', { name: 'Sites you save most' })).toBeVisible();
    await expect(shelf.locator('.shelf__site').first()).toBeVisible();
    await expect(shelf.getByRole('heading', { name: 'Most used tags' })).toBeVisible();
    await expect(shelf.locator('.shelf__week')).toHaveCount(12);
    await expect(shelf.getByText(/^Oldest link: /)).toBeVisible();
    await expect(page.getByText('Member since September 2025')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Connected accounts' })).toBeVisible();
    await expect(page.getByText('Connected Sep 14, 2025')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your data' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible();

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('a new account sees the empty state', async ({ page }) => {
    await seedSession(page);
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.empty],
    );
    await page.goto('/settings/account');

    await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
    await expect(page.locator('.shelf__counts')).toHaveCount(0);
  });

  test('the provider photo shows on Account and in the account menu or the You page', async ({
    page,
  }) => {
    await routeSampleAvatars(page);
    await seedSession(page, { ...MOCK_USER, image: SAMPLE_AVATAR_PATH });
    await page.goto('/settings/account');

    const image = page.locator('app-settings-account-page ui-avatar img');
    await expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect
      .poll(() => photoLoaded(page, 'app-settings-account-page ui-avatar img'))
      .toBe(true);

    if (isCompact(page)) {
      await tabBar(page).getByRole('link', { name: 'You' }).click();
      await expect(page).toHaveURL('/settings');
      await expect
        .poll(() => photoLoaded(page, 'app-settings-index-page ui-avatar img'))
        .toBe(true);
    } else {
      await expect.poll(() => photoLoaded(page, '.shell__user ui-avatar img')).toBe(true);
      await openAccountMenu(page);
      await expect.poll(() => photoLoaded(page, '.shell__account ui-avatar img')).toBe(true);
    }
  });

  test('a photo that fails to load falls back to the initials', async ({ page }) => {
    await routeSampleAvatars(page);
    await seedSession(page, { ...MOCK_USER, image: BROKEN_AVATAR_PATH });
    await page.goto('/settings/account');

    const avatar = page.locator('app-settings-account-page ui-avatar');
    await expect(avatar.locator('.ui-avatar__initials')).toHaveAttribute('data-initials', 'EU');
    await expect(avatar.locator('img')).toHaveCount(0);
  });

  test('a demo account has no connected provider and no Delete account', async ({ page }) => {
    await seedSession(page, demoUser(12));
    await page.goto('/settings/account');

    await expect(
      page.getByText("The demo account isn't linked to Google or GitHub."),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete account' })).toHaveCount(0);
  });

  test('Privacy and data "Open export" leads to Your data', async ({ page }) => {
    await seedSession(page);
    await page.goto('/settings/privacy');
    await page.getByRole('link', { name: 'Open export' }).click();

    await expect(page).toHaveURL('/settings/account#your-data');
    await expect(page.getByRole('heading', { name: 'Your data' })).toBeInViewport();
  });
});

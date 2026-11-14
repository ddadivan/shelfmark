import { type Page } from '@playwright/test';
import { MOCK_USER, openAccountMenu, seedSession } from './support/mock-session';
import { routeSampleAvatars, SAMPLE_AVATAR_PATH } from './support/sample-avatar';
import { isCompact, tabBar } from './support/sidebar';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';

/** Whether the avatar image inside `scope` has loaded (a decoded picture, not the initials). */
async function photoLoaded(page: Page, selector: string): Promise<boolean> {
  // A locator with arguments, not a code string built from the selector (CodeQL
  // js/bad-code-sanitization). Polled, so a missing image is simply "not yet".
  const img = page.locator(selector).first();
  if ((await img.count()) === 0) {
    return false;
  }
  return img.evaluate((el) => {
    const image = el as unknown as { complete: boolean; naturalWidth: number };
    return image.complete && image.naturalWidth > 0;
  });
}

// #352: the richer Account page — the provider photo, "Your shelf", connected accounts and
// "Your data" (export moved here from its own Settings section).
test.describe('account page (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  // The production build registers the Angular service worker. Once it controls the page,
  // image requests go through it and bypass `page.route`, so the sample avatar 404s on the
  // second page (seen in CI on the You page). Block it here: these tests are about the photo.
  test.use({ serviceWorkers: 'block' });

  test(
    'the provider photo shows on Account and in the account menu or the You page',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
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
    },
  );
});

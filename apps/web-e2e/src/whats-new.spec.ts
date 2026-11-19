import type { Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_USER, seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';
import { MOCK_WHATS_NEW_KEY, seedWhatsNewSeen } from './support/whats-new';

// What's new, the public changelog and the release version (#424). In the mock build the last seen
// release lives in localStorage (`MockUserSettingsApi`), so a stored old release simulates an update.

const ONBOARDED = { ...MOCK_USER, onboardingCompletedAt: '2026-01-01T00:00:00.000Z' };
const DIALOG = "What's new in Shelfmark";
/** Fast-forwards past the dialog's start delay (1.5 s) and one retry (5 s). */
const SETTLE_MS = 7000;

/** The "What's new" entry: a sidebar footer row on desktop, a row of the You list in the mobile shell. */
function entry(page: Page, withDot: boolean) {
  const name = withDot ? "What's new new" : "What's new";
  return isCompact(page)
    ? page.getByRole('link', { name, exact: true })
    : page.getByRole('treeitem', { name, exact: true });
}

test.describe('public changelog', () => {
  test(
    'a guest opens /changelog: releases newest first, its own title',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      const response = await page.goto('/changelog');

      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: "What's new" })).toBeVisible();
      await expect(page).toHaveTitle("What's new · Shelfmark");
      const releases = page.getByRole('heading', { level: 2 });
      await expect(releases.first()).toHaveText(/Shelfmark \d+\.\d+\.\d+/);
      await expect(page.getByRole('heading', { level: 2, name: 'Shelfmark 2.0.0' })).toBeVisible();
      const release = page.getByRole('region', { name: 'Shelfmark 2.0.0' });
      await expect(release.getByRole('heading', { level: 3, name: 'New' })).toBeVisible();
      await expect(release.getByRole('heading', { level: 4, name: 'A fresh look' })).toBeVisible();
      const hotfix = page.getByRole('region', { name: 'Shelfmark 2.0.5' });
      await expect(hotfix.getByRole('heading', { level: 3 })).toHaveText('Fixed');
      await expect(hotfix.getByRole('heading', { level: 4 })).toHaveCount(0);
      await expect(
        page.getByText('A link typed as example.com saves like any other.'),
      ).toBeVisible();
      // Hotfix 2.2.2 leads the page (fixes only), then 2.2.1 and 2.2.0 (the AI release); 2.1.0
      // (#464) keeps its highlights.
      await expect(releases.first()).toHaveText('Shelfmark 2.2.2');
      await expect(
        page.getByRole('region', { name: 'Shelfmark 2.2.2' }).getByRole('heading', { level: 3 }),
      ).toHaveText('Fixed');
      await expect(releases.nth(1)).toHaveText('Shelfmark 2.2.1');
      await expect(releases.nth(2)).toHaveText('Shelfmark 2.2.0');
      await expect(
        page.getByRole('region', { name: 'Shelfmark 2.1.0' }).getByRole('heading', {
          level: 4,
          name: 'Side by side',
        }),
      ).toBeVisible();
      await expect(page.getByText(/You're using Shelfmark \d+\.\d+\.\d+/)).toBeVisible();

      const overflow = await page.evaluate<number>(
        '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
      );
      expect(overflow).toBeLessThanOrEqual(0);
    },
  );

  test('the landing footer links to it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: "What's new" }).click();

    await expect(page).toHaveURL(/\/changelog$/);
    await expect(page.getByRole('heading', { level: 1, name: "What's new" })).toBeVisible();
  });
});

test.describe("What's new after an update (mock API)", () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test(
    'shows once after an update; the dot goes once it is seen',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedSession(page, ONBOARDED);
      await seedWhatsNewSeen(page, '1.0.0');
      await page.goto(isCompact(page) ? '/settings' : '/links');

      await expect(entry(page, true)).toBeVisible();
      const dialog = page.getByRole('dialog', { name: DIALOG });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { level: 3 }).first()).toBeVisible();
      await expect(
        dialog.getByRole('link', { name: /^And \d+ more improvements and fixes$/ }),
      ).toBeVisible();
      await dialog.getByRole('button', { name: 'Got it' }).click();

      await expect(dialog).toHaveCount(0);
      await expect(entry(page, false)).toBeVisible();
      expect(await page.evaluate((key) => localStorage.getItem(key), MOCK_WHATS_NEW_KEY)).toMatch(
        /^\d+\.\d+\.\d+$/,
      );

      await page.reload();
      await expect(entry(page, false)).toBeVisible();
      await page.clock.runFor(SETTLE_MS);
      await expect(page.getByRole('dialog', { name: DIALOG })).toHaveCount(0);
    },
  );

  test(
    'the entry opens it again, and "See all changes" leads to /changelog',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedSession(page, ONBOARDED);
      await seedWhatsNewSeen(page);
      await page.goto(isCompact(page) ? '/settings' : '/links');

      await entry(page, false).click();
      const dialog = page.getByRole('dialog', { name: DIALOG });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'See all changes' }).click();

      await expect(page).toHaveURL(/\/changelog$/);
      await expect(page.getByRole('heading', { level: 1, name: "What's new" })).toBeVisible();
    },
  );

  test('"And N more…" opens /changelog', { tag: E2E_TAG.Phone }, async ({ page }) => {
    await seedSession(page, ONBOARDED);
    await seedWhatsNewSeen(page, '1.0.0');
    await page.goto(isCompact(page) ? '/settings' : '/links');

    const dialog = page.getByRole('dialog', { name: DIALOG });
    await dialog.getByRole('link', { name: /^And \d+ more improvements and fixes$/ }).click();

    await expect(page).toHaveURL(/\/changelog$/);
    await expect(dialog).toHaveCount(0);
  });

  test("a new account gets the welcome tour, never What's new", async ({ page }) => {
    await page.clock.install();
    await seedSession(page, { ...MOCK_USER, onboardingCompletedAt: null });
    await seedWhatsNewSeen(page, null);
    await page.goto('/links');

    await expect(page.getByRole('dialog').first()).toBeVisible();
    await page.clock.runFor(SETTLE_MS);
    await expect(page.getByRole('dialog', { name: DIALOG })).toHaveCount(0);
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), MOCK_WHATS_NEW_KEY))
      .toMatch(/^\d+\.\d+\.\d+$/);
  });
});

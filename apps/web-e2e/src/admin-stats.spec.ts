import type { Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_ADMIN_KEY, seedMockKey } from './support/feedback';
import { openAccountMenu, openYouPage, seedSession } from './support/mock-session';
import { isCompact, tabBar } from './support/sidebar';
import { expect, test } from './support/test';

// Same value as MOCK_ADMIN_STATS_STORAGE_KEY in apps/web/src/app/features/admin/mock/models.
const MOCK_ADMIN_STATS_KEY = 'sm-mock-admin-stats';

/** Picks a segmented option: a click event on the visually hidden radio (it can sit under the tab bar). */
async function pick(page: Page, group: string, name: string): Promise<void> {
  const radio = page
    .getByRole('main')
    .getByRole('radiogroup', { name: group })
    .getByRole('radio', { name, exact: true });
  await radio.dispatchEvent('click');
}

/** Opens the stats the way each device has them: the account menu, or the You list. */
async function openStats(page: Page): Promise<void> {
  if (isCompact(page)) {
    await openYouPage(page);
    await page.getByRole('main').getByRole('link', { name: 'Usage stats' }).click();
  } else {
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Usage stats' }).click();
  }
  await expect(page).toHaveURL(/\/admin\/stats$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Usage stats' })).toBeVisible();
}

test.describe('admin usage stats (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test(
    'the author sees the numbers and switches to the inbox and back',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedSession(page);
      await page.goto('/links');
      await openStats(page);

      const main = page.getByRole('main');
      await expect(main.getByText('Real users', { exact: true })).toBeVisible();
      await expect(main.getByText('47', { exact: true })).toBeVisible();
      await expect(main.getByRole('img', { name: /Sign-ups, last 30 days/ })).toBeVisible();
      await expect(main.getByRole('progressbar', { name: 'Folders inside folders' })).toBeVisible();
      await expect(main.getByText('Never chosen').first()).toBeVisible();

      await pick(page, 'Show by', 'Weeks');
      await expect(main.getByRole('img', { name: /Sign-ups, last 12 weeks/ })).toBeVisible();

      await pick(page, 'Admin pages', 'Feedback');
      await expect(page).toHaveURL(/\/admin\/feedback$/);
      await pick(page, 'Admin pages', 'Stats');
      await expect(page).toHaveURL(/\/admin\/stats$/);
      // The page never scrolls sideways, also on a 360px phone.
      const overflow = await page.evaluate<number>(
        'document.documentElement.scrollWidth - document.documentElement.clientWidth',
      );
      expect(overflow).toBeLessThanOrEqual(0);
    },
  );

  test('explains the hidden numbers while there are too few users', async ({ page }) => {
    await seedMockKey(page, MOCK_ADMIN_STATS_KEY, 'few');
    await seedSession(page);
    await page.goto('/admin/stats');
    await expect(
      page.getByText('Not enough users yet: shares and groups appear from 3 real users.'),
    ).toBeVisible();
  });

  test('offers Retry when the stats cannot load', async ({ page }) => {
    await seedMockKey(page, MOCK_ADMIN_STATS_KEY, 'fails');
    await seedSession(page);
    await page.goto('/admin/stats');
    await expect(page.getByText("Couldn't load the stats.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test(
    'a regular user has no entry and /admin/stats leads to the links',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedMockKey(page, MOCK_ADMIN_KEY, 'off');
      await seedSession(page);
      await page.goto('/links');
      await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
      if (isCompact(page)) {
        await openYouPage(page);
        await expect(
          page.getByRole('main').getByRole('link', { name: 'Your feedback' }),
        ).toBeVisible();
        await expect(page.getByRole('main').getByRole('link', { name: 'Usage stats' })).toHaveCount(
          0,
        );
      } else {
        await openAccountMenu(page);
        await expect(page.getByRole('menuitem', { name: 'Send feedback' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Usage stats' })).toHaveCount(0);
        await page.keyboard.press('Escape');
      }
      await page.goto('/admin/stats');
      await expect(page).toHaveURL(/\/links$/);
    },
  );
});

import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';

test.describe('Recently opened page (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  const rows = (page: Page) => page.locator('app-link-history-row');

  async function openRecent(page: Page) {
    if (isCompact(page)) {
      // The Library tile opens a sheet on a phone (see mobile.spec); the page stays at its URL.
      await page.goto('/recent');
    } else {
      await page.goto('/links');
      await page.getByRole('treeitem', { name: 'Recently opened' }).click();
    }
    await expect(page).toHaveURL('/recent');
    await expect(page.getByRole('heading', { level: 1, name: 'Recently opened' })).toBeVisible();
    await expect(rows(page).first()).toBeVisible();
  }

  test('opens from the sidebar row, in day groups, with no side panel or toggle', async ({
    page,
  }) => {
    await openRecent(page);

    await expect(page.getByRole('group', { name: 'Today' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
    await expect(rows(page).first().locator('time')).toBeVisible();
    await expect(page.getByRole('button', { name: /recently opened/i })).toHaveCount(0);
    await expect(page.locator('app-recent-links-panel')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Clear history' })).toBeVisible();
    // The shell has no inline column: the page content is the one main area.
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('opening a row in a new tab moves it to the top of the history', async ({
    page,
    context,
  }) => {
    await openRecent(page);
    const second = rows(page).nth(1);
    const title = (await second.locator('.ui-history-row__title').innerText()).trim();

    const popup = context.waitForEvent('page');
    await second.getByRole('link', { name: new RegExp(title) }).click();
    await (await popup).close();

    await expect(rows(page).first().locator('.ui-history-row__title')).toHaveText(title);
  });
});

test.describe('Library items skip off-screen work (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('cards and rows use content-visibility: auto', async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    const item = page.locator('.library__list > li').first();
    await expect(item).toBeVisible();
    expect(
      await page.evaluate<string>(
        "getComputedStyle(document.querySelector('.library__list > li')).contentVisibility",
      ),
    ).toBe('auto');
  });
});

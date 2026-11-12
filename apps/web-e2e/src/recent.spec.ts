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

  test('fits the viewport without horizontal scroll', async ({ page }) => {
    await openRecent(page);

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
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

  test('removes one link from the history with a toast', async ({ page }) => {
    await openRecent(page);
    const before = await rows(page).count();
    const first = rows(page).first();
    const title = (await first.locator('.ui-history-row__title').innerText()).trim();

    await first.getByRole('button', { name: /^More for / }).click();
    await page.getByRole('menuitem', { name: 'Remove from history' }).click();

    await expect(rows(page)).toHaveCount(before - 1);
    await expect(page.getByRole('status').getByText('Removed from history')).toBeVisible();
    await expect(rows(page).first().locator('.ui-history-row__title')).not.toHaveText(title);
  });

  test('the row menu lists its items with Remove after a separator, and Show in folder navigates', async ({
    page,
  }) => {
    await openRecent(page);
    const first = rows(page).first();

    await first.getByRole('button', { name: /^More for / }).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Open in new tab',
      'Show in folder',
      'Copy link',
      'Remove from history',
    ]);
    await expect(menu.getByRole('separator')).toHaveCount(1);

    await menu.getByRole('menuitem', { name: 'Show in folder' }).click();
    await expect(page).toHaveURL(/\/(folders\/[\w-]+|unsorted)$/);
  });

  test('clearing the history asks first; Cancel keeps it, Clear empties it', async ({ page }) => {
    await openRecent(page);
    const before = await rows(page).count();

    await page.getByRole('button', { name: 'Clear history' }).click();
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog.getByText('Clear history?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(rows(page)).toHaveCount(before);

    await page.getByRole('button', { name: 'Clear history' }).click();
    await dialog.getByRole('button', { name: 'Clear history' }).click();

    await expect(page.getByRole('heading', { name: 'Nothing opened yet' })).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Clear history' })).toHaveCount(0);
    await expect(page.getByRole('status').getByText('History cleared')).toBeVisible();
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

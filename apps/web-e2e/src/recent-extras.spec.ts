import { type Locator, type Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { settled } from './support/settled';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';

// The mock state lives in the page: after the first load every step stays inside the app.
test.describe('Recently opened extras (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  const rows = (page: Page) => page.locator('app-link-history-row');
  const titleOf = (row: Locator) => row.locator('.ui-history-row__title');
  const notice = (page: Page) => page.locator('ui-notice');

  async function openRecent(page: Page): Promise<void> {
    await page.goto('/recent');
    await expect(page.getByRole('heading', { level: 1, name: 'Recently opened' })).toBeVisible();
    await expect(rows(page).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause history' })).toBeVisible();
  }

  /** Opens a row's link (a new tab) and closes the tab again. */
  async function openRow(page: Page, row: Locator): Promise<void> {
    const title = (await titleOf(row).innerText()).trim();
    const popup = page.waitForEvent('popup');
    await row.getByRole('link', { name: new RegExp(escapeRegExp(title)) }).click();
    await (await popup).close();
  }

  test('while paused an open is not added; after resuming it is', async ({ page }) => {
    await openRecent(page);
    const first = (await titleOf(rows(page).first()).innerText()).trim();
    const second = (await titleOf(rows(page).nth(1)).innerText()).trim();

    await page.getByRole('button', { name: 'Pause history' }).click();
    await expect(notice(page)).toContainText("History is paused. Links you open now aren't added.");
    await expect(page.getByRole('button', { name: 'Resume history' })).toBeVisible();

    await openRow(page, rows(page).nth(1));
    // Give a recorded open the time to land (it would move the row to the top).
    await page.waitForTimeout(600);
    await expect(titleOf(rows(page).first())).toHaveText(first);
    await expect(titleOf(rows(page).nth(1))).toHaveText(second);

    await notice(page).getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(notice(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pause history' })).toBeVisible();

    await openRow(page, rows(page).nth(1));
    await expect(titleOf(rows(page).first())).toHaveText(second);
  });

  test('the search filters the history and says when nothing matches', async ({ page }) => {
    await openRecent(page);
    const before = await rows(page).count();
    const target = (await titleOf(rows(page).nth(1)).innerText()).trim();
    const search = page.getByRole('searchbox', { name: 'Search history' });

    await search.fill(target);
    await expect(titleOf(rows(page).first())).toHaveText(target);
    expect(await rows(page).count()).toBeLessThan(before);
    // Every word of the search is in the title (or the domain) of every row left.
    const words = target.toLowerCase().split(/\s+/);
    for (const row of await rows(page).all()) {
      const text = (await row.innerText()).toLowerCase();
      for (const word of words) {
        expect(text).toContain(word);
      }
    }

    await search.fill('zzqx nothing like this');
    await expect(page.getByRole('heading', { name: 'Nothing matches' })).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
    await page.locator('ui-empty-state').getByRole('button', { name: 'Clear search' }).click();
    await expect(rows(page)).toHaveCount(before);
    await expect(search).toHaveValue('');
  });

  test('Copy link puts the address on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openRecent(page);
    const first = rows(page).first();
    const href = await first.locator('a.ui-history-row__link').getAttribute('href');

    await first.getByRole('button', { name: /^More for / }).click();
    await page.getByRole('menuitem', { name: 'Copy link' }).click();

    await expect(page.getByRole('status').getByText('Link copied')).toBeVisible();
    expect(await page.evaluate<string>('navigator.clipboard.readText()')).toBe(href);
  });

  test('Show in folder opens the folder (or Unsorted) of the link', async ({ page }) => {
    await openRecent(page);
    const first = rows(page).first();
    const title = (await titleOf(first).innerText()).trim();

    await first.getByRole('button', { name: /^More for / }).click();
    await page.getByRole('menuitem', { name: 'Show in folder' }).click();

    await expect(page).toHaveURL(/\/(folders\/[\w-]+|unsorted)$/);
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  });

  test('phone: swiping a row left reveals Remove', { tag: E2E_TAG.Mobile }, async ({ page }) => {
    test.skip(!isCompact(page), 'the swipe is the phone pattern');
    await openRecent(page);
    const before = await rows(page).count();
    const first = rows(page).first();
    const title = (await titleOf(first).innerText()).trim();
    const surface = first.locator('.link-history-row__surface');
    const remove = first.getByRole('button', { name: `Remove ${title} from history` });
    await expect(page.getByText('Swipe a row left to remove it from history.')).toBeVisible();

    const box = await surface.boundingBox();
    if (!box) {
      throw new Error('row not laid out');
    }
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width - 20, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 80, y, { steps: 4 });
    await page.mouse.move(box.x + box.width - 200, y, { steps: 6 });
    await page.mouse.up();

    await expect(surface).not.toHaveCSS('translate', /^(none|0px)$/);
    await expect(remove).toBeInViewport();
    await remove.click();

    await expect(rows(page)).toHaveCount(before - 1);
    await expect(page.getByRole('status').getByText('Removed from history')).toBeVisible();
    await expect(titleOf(rows(page).first())).not.toHaveText(title);
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      test('paused notice, search and rows have no serious axe violations', async ({
        page,
      }, testInfo) => {
        await openRecent(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await page.getByRole('button', { name: 'Pause history' }).click();
        await expect(notice(page)).toBeVisible();
        await page.getByRole('searchbox', { name: 'Search history' }).fill('a');
        await expect(rows(page).first()).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, testInfo);

        await page.getByRole('searchbox', { name: 'Search history' }).fill('zzqx nothing');
        await expect(page.getByRole('heading', { name: 'Nothing matches' })).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, testInfo);
      });
    });
  }
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { MOCK_LINKS_SCENARIO } from './models/mock-links-scenario.const';
import { seedSession } from './support/mock-session';
import { switchView } from './support/library-toolbar';
import { isCompact } from './support/sidebar';
import { E2E_TAG } from './models/e2e-tag.const';
import { openCardMenu } from './support/card-menu';

// The mock library has 60 links (a first page of 50).
const ALL_LINKS = 60;

test.describe('links feed (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  async function openFeed(page: Page, path = '/links') {
    await page.goto(path);
    await expect(page.locator('ui-card').first()).toBeVisible();
  }

  async function firstTitle(page: Page): Promise<string> {
    return page.locator('ui-card').first().getByRole('heading').innerText();
  }

  // The Cards grid's minimum card width is the Grid size step (default 4: 14.5rem, Shelf View menu),
  // so the cards fold without squeezing. The feed is centred and capped at 150rem; side padding and the sidebar eat
  // into the content width, so the columns are the ones the window leaves.
  test('at 1280, 1920 and 2560px the grid folds cards no narrower than its minimum width', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1280, height: 800, min: 14.5 },
      { width: 1920, height: 1080, min: 14.5 },
      { width: 2560, height: 1440, min: 14.5 },
    ]) {
      test.skip(isCompact(page), 'the desktop grid');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openFeed(page);
      // Masonry is the default view; equal row heights belong to the Cards grid.
      await switchView(page, 'Cards');
      await expect(page.locator('.library__grid--masonry')).toHaveCount(0);
      const { columns, card, row } = await page.evaluate<{
        columns: number;
        card: number;
        row: number[];
      }>(`(() => {
        const grid = document.querySelector('.library__grid');
        const style = getComputedStyle(grid);
        const items = Array.from(grid.children);
        const top = items[0].getBoundingClientRect().top;
        const row = items.filter((el) => el.getBoundingClientRect().top === top);
        return {
          columns: style.gridTemplateColumns.split(' ').length,
          card: row[0].getBoundingClientRect().width,
          row: row.map((el) => el.getBoundingClientRect().height),
        };
      })()`);
      const rem = 16;
      expect(columns, `at ${viewport.width}px`).toBeGreaterThanOrEqual(2);
      expect(card).toBeGreaterThanOrEqual(viewport.min * rem - 0.5);
      // Equal heights in a row.
      expect(new Set(row.map((h) => Math.round(h))).size).toBe(1);
    }
  });

  test('hovering a card reveals the ⋯ button, and the star is always there', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.use.hasTouch === true, 'touch has no hover');
    await openFeed(page);
    const card = page.locator('ui-card').first();
    const more = card.locator('.ui-card__more');

    // Shelf card: no "Open" bar over the preview; the star is a glass button, always visible.
    await expect(card.locator('.ui-card__overlay')).toHaveText('');
    await expect(card.getByRole('button', { name: /^Favorite: / })).toBeVisible();
    await expect(more).toHaveCSS('opacity', '0');
    await card.hover();

    await expect(more).toHaveCSS('opacity', '1');
    await expect(card.getByRole('button', { name: /^Actions for / })).toBeVisible();
  });

  test('⌘ / Ctrl-click on the card opens the link in a new tab', async ({ page }, testInfo) => {
    test.skip(testInfo.project.use.hasTouch === true, 'touch has no modifier keys');
    await page.context().route('https://**/*', (route) => route.abort());
    await openFeed(page);
    const card = page.locator('ui-card').first();

    // A plain click opens the link preview (#555); ⌘ / Ctrl-click opens the link.
    const popup = page.context().waitForEvent('page');
    await card.getByRole('link').click({ modifiers: ['ControlOrMeta'] });
    await (await popup).close();
  });

  test('keyboard focus on a card reveals the ⋯ button', async ({ page }) => {
    await openFeed(page);
    const card = page.locator('ui-card').first();

    await card.getByRole('link').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');

    await expect(card.locator('.ui-card__more')).toHaveCSS('opacity', '1');
  });

  test(
    'loads the rest when the end of the list is reached',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openFeed(page);

      await page.keyboard.press('End');

      await expect(page.locator('ui-card')).toHaveCount(ALL_LINKS);
      await expect(page.getByText(`${ALL_LINKS} links`)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
    },
  );

  test(
    'switches to the list view and remembers it after a reload',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openFeed(page);

      await switchView(page, 'List');
      await expect(page.locator('ui-list-item').first()).toBeVisible();
      await expect(page.locator('ui-card')).toHaveCount(0);

      await page.reload();
      await expect(page.locator('ui-list-item').first()).toBeVisible();
    },
  );

  test(
    'deleting asks first, removes the card and Undo brings it back',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openFeed(page);
      const title = await firstTitle(page);

      await openCardMenu(page.locator('ui-card').first());
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      const confirm = page.getByRole('alertdialog');
      await expect(confirm).toContainText('moves to Trash');
      await confirm.getByRole('button', { name: 'Delete' }).click();

      await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
      await expect(page.getByText('Moved to Trash')).toBeVisible();

      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    },
  );

  test('Undo is reachable by keyboard with the toast shortcut', async ({ page }) => {
    await openFeed(page);
    const title = await firstTitle(page);

    await openCardMenu(page.locator('ui-card').first());
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).press('Enter');
    await expect(page.getByText('Moved to Trash')).toBeVisible();
    // The hint is part of the polite live region, so it is announced with the toast.
    await expect(page.locator('ui-toast-region')).toContainText('Press Alt+Shift+T to reach Undo');

    await page.keyboard.press('Alt+Shift+T');
    const undo = page.getByRole('button', { name: 'Undo' });
    await expect(undo).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(undo).toHaveCount(0);
    await expect(page.locator('ui-toast-region').getByRole('button')).toHaveCount(0);
  });

  test('a link saved from the header appears at the top', async ({ page }) => {
    await openFeed(page);

    await page.getByRole('button', { name: 'Add link' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await dialog.getByLabel('Link', { exact: true }).fill('https://example.org/post');
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on example.org');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText(/Saved to /)).toBeVisible();
    await expect(page.locator('ui-card').first()).toContainText('Page on example.org');
  });

  test('the shell fills the viewport and an empty library shows the first run under the head', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.empty],
    );
    await page.goto('/links');
    // Shelf block 6a: All links of an empty library is the first run, not an empty state.
    const title = page.getByRole('heading', { name: 'Your shelf is empty' });
    await expect(title).toBeVisible();

    const box = async (selector: string) => {
      const found = await page.locator(selector).first().boundingBox();
      if (!found) {
        throw new Error(`${selector} has no box`);
      }
      return found;
    };
    const sidebar = await box('.shell__sidebar');
    const main = await box('.shell__main');
    // Sidebar and main column both run to the bottom of the window; the document never scrolls.
    for (const column of [sidebar, main]) {
      expect(column.y + column.height).toBeGreaterThanOrEqual(900 - 1);
    }
    expect(await page.evaluate('document.documentElement.scrollHeight')).toBeLessThanOrEqual(900);

    // The first run follows the page head (title and toolbar), inside the main column.
    const firstRun = await box('app-first-run');
    const toolbar = await box('.library__toolbar');
    expect(firstRun.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height);
    expect(firstRun.x).toBeGreaterThanOrEqual(main.x);
    expect(firstRun.x + firstRun.width).toBeLessThanOrEqual(main.x + main.width);
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(3);
  });

  test.describe('pending image capture', () => {
    test('re-captures the images of a pending link and shows the new ones', async ({ page }) => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
        'base64',
      );
      const requested: string[] = [];
      await page.route(/\/api\/links\/[^/]+\/(image|favicon)\?v=/, async (route) => {
        requested.push(route.request().url());
        await route.fulfill({ contentType: 'image/png', body: png });
      });
      await page.addInitScript(
        ([key, value]) => sessionStorage.setItem(key, value),
        [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.pendingImages],
      );
      await page.goto('/links');

      const image = page.locator('ui-card').first().locator('img[src*="/image?v="]');
      await expect(image).toHaveAttribute('src', /\/image\?v=0123456789abcdef$/);
      // The pending marker itself is never bound as an image source.
      expect(requested.some((url) => url.endsWith('v=pending'))).toBe(false);
      expect(requested.some((url) => url.endsWith('/image?v=0123456789abcdef'))).toBe(true);
    });
  });
});

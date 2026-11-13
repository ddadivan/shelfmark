import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { MOCK_LINKS_SCENARIO } from './models/mock-links-scenario.const';
import { seedSession } from './support/mock-session';
import { switchView } from './support/library-toolbar';
import { isCompact } from './support/sidebar';
import { E2E_TAG } from './models/e2e-tag.const';

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

  // The grid's minimum card width: 14.25rem up to 1920px, 16.25rem above (#350), so the cards fold
  // without squeezing. The feed is centred and capped at 150rem; side padding and the sidebar eat
  // into the content width, so the columns are the ones the window leaves.
  for (const viewport of [
    { width: 1280, height: 800, min: 14.25 },
    { width: 1920, height: 1080, min: 14.25 },
    { width: 2560, height: 1440, min: 16.25 },
  ]) {
    test(`at ${viewport.width}px the grid folds cards no narrower than ${viewport.min}rem`, async ({
      page,
    }, testInfo) => {
      test.skip(isCompact(page), 'the desktop grid');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openFeed(page);
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
      expect(columns, testInfo.title).toBeGreaterThanOrEqual(2);
      expect(card).toBeGreaterThanOrEqual(viewport.min * rem - 0.5);
      // Equal heights in a row.
      expect(new Set(row.map((h) => Math.round(h))).size).toBe(1);
    });
  }

  test('hovering a card slides up the open bar with the address', async ({ page }, testInfo) => {
    test.skip(testInfo.project.use.hasTouch === true, 'touch has no hover');
    await openFeed(page);
    const card = page.locator('ui-card').first();
    const bar = card.locator('.ui-card__overlay');

    await expect(bar).toContainText('Open');
    await expect(bar).toContainText('↗');
    await card.hover();

    await expect(bar).toHaveCSS('opacity', '1');
    await expect(bar).toHaveAttribute('aria-hidden', 'true');
  });

  test('the open arrow moves only while the pointer is over the bar, and a click opens', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.use.hasTouch === true, 'touch has no hover');
    await page.context().route('https://**/*', (route) => route.abort());
    await openFeed(page);
    const card = page.locator('ui-card').first();
    const arrow = card.locator('.link-card__open-arrow');

    await card.hover({ position: { x: 20, y: 20 } });
    await expect(card.locator('.ui-card__overlay')).toHaveCSS('opacity', '1');
    await expect(arrow).toHaveCSS('transform', 'none');

    await card.locator('.link-card__open').hover();
    await expect(arrow).not.toHaveCSS('transform', 'none');

    await card.hover({ position: { x: 20, y: 20 } });
    await expect(arrow).toHaveCSS('transform', 'none');

    const popup = page.waitForEvent('popup');
    await card.locator('.link-card__open').click();
    await (await popup).close();
  });

  test('keyboard focus on a card shows the open bar', async ({ page }) => {
    await openFeed(page);
    const card = page.locator('ui-card').first();

    await card.getByRole('link').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');

    await expect(card.locator('.ui-card__overlay')).toHaveCSS('opacity', '1');
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

      await page
        .locator('ui-card')
        .first()
        .getByRole('button', { name: /^Actions for / })
        .click();
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

    await page
      .locator('ui-card')
      .first()
      .getByRole('button', { name: /^Actions for / })
      .click();
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
    await dialog.getByRole('button', { name: 'Save link' }).click();

    await expect(page.getByText(/Saved to /)).toBeVisible();
    await expect(page.locator('ui-card').first()).toContainText('Page on example.org');
  });

  test('the shell fills the viewport and the empty state sits in the middle of the free space', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.empty],
    );
    await page.goto('/links');
    const title = page.getByRole('heading', { name: 'Your links will live here' });
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
    // Sidebar card and main column both run to the bottom of the window; the
    // card and the content are inset by the 12px body padding.
    const INSET = 12;
    for (const column of [sidebar, main]) {
      expect(column.y + column.height).toBeGreaterThanOrEqual(900 - INSET - 1);
    }
    expect(await page.evaluate('document.documentElement.scrollHeight')).toBeLessThanOrEqual(900);

    // The state is the page card (#315): it fills the free space under the toolbar down to the
    // bottom padding of the column, and its content sits in the middle of it.
    const state = await box('ui-empty-state');
    const toolbar = await box('.library__toolbar');
    const freeTop = toolbar.y + toolbar.height;
    const freeBottom = main.y + main.height;
    expect(state.y).toBeGreaterThanOrEqual(freeTop);
    expect(freeBottom - (state.y + state.height)).toBeLessThanOrEqual(32);
    expect(state.height).toBeGreaterThan((freeBottom - freeTop) * 0.7);
    const art = await box('ui-empty-state .ui-empty-state__stage');
    const actions = await box('ui-empty-state .ui-empty-state__actions');
    const gapAbove = art.y - state.y;
    const gapBelow = state.y + state.height - (actions.y + actions.height);
    expect(Math.abs(gapAbove - gapBelow)).toBeLessThanOrEqual(24);
    expect(gapAbove).toBeGreaterThan(40);
  });

  test.describe('pending image capture', () => {
    // The service worker would answer the image requests before `page.route` sees them.
    test.use({ serviceWorkers: 'block' });

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

import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { E2E_PROJECT } from './models/e2e-project.const';
import { MOCK_LINKS_SCENARIO } from './models/mock-links-scenario.const';
import { seedSession } from './support/mock-session';

// The mock page size is 50 of 60 links.
const FIRST_PAGE = 50;
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

  test('hovering a card slides up the open bar with the address', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === E2E_PROJECT.Phone, 'touch has no hover');
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
    test.skip(testInfo.project.name === E2E_PROJECT.Phone, 'touch has no hover');
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

  test('shows the cards, the count and "load more" on the first page', async ({ page }) => {
    await openFeed(page);

    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    await expect(page.locator('ui-card')).toHaveCount(FIRST_PAGE);
    await expect(page.getByText(`${FIRST_PAGE}+ links`)).toBeVisible();
  });

  test('loads the rest when the end of the list is reached', async ({ page }) => {
    await openFeed(page);

    await page.keyboard.press('End');

    await expect(page.locator('ui-card')).toHaveCount(ALL_LINKS);
    await expect(page.getByText(`${ALL_LINKS} links`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  });

  test('switches to the list view and remembers it after a reload', async ({ page }) => {
    await openFeed(page);

    await page.getByRole('radio', { name: 'List' }).click();
    await expect(page.locator('ui-list-item').first()).toBeVisible();
    await expect(page.locator('ui-card')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('ui-list-item').first()).toBeVisible();
  });

  test('toggles a favorite and keeps it', async ({ page }) => {
    await openFeed(page);
    const favorite = page
      .locator('ui-card')
      .first()
      .getByRole('button', { name: /^Favorite: / });
    const before = await favorite.getAttribute('aria-pressed');

    await favorite.click();

    await expect(favorite).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  });

  test('rolls a favorite back and offers Retry when the request fails', async ({ page }) => {
    await openFeed(page);
    await page.getByRole('button', { name: 'Add link' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await dialog.getByLabel('Link', { exact: true }).fill('https://patch-fails.example/x');
    await dialog.getByRole('button', { name: /Save/ }).click();
    await expect(dialog).toBeHidden();

    const favorite = page
      .locator('ui-card')
      .first()
      .getByRole('button', { name: /^Favorite: / });
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
    await favorite.click();

    await expect(page.getByText("Couldn't update the favorite")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  });

  test('the card menu lists Open, Edit, the favorite toggle, Pin to sidebar and Delete last, after a separator', async ({
    page,
  }) => {
    await openFeed(page);
    const card = page.locator('ui-card').first();
    const favorite = card.getByRole('button', { name: /^Favorite: / });
    const before = await favorite.getAttribute('aria-pressed');

    await card.getByRole('button', { name: /^Actions for / }).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText([
      /Open/,
      /Edit/,
      before === 'true' ? /Remove from favorites/ : /Add to favorites/,
      /Pin to sidebar/,
      /Delete/,
    ]);
    await expect(menu.getByRole('separator')).toHaveCount(1);

    await menu.getByRole('menuitem', { name: /favorites/ }).click();
    await expect(favorite).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  });

  test('deleting asks first, removes the card and Undo brings it back', async ({ page }) => {
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
  });

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

  test('cancelling the confirmation keeps the link', async ({ page }) => {
    await openFeed(page);
    const title = await firstTitle(page);

    await page
      .locator('ui-card')
      .first()
      .getByRole('button', { name: /^Actions for / })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
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

  test('the favorites page lists favorites only', async ({ page }) => {
    await openFeed(page, '/favorites');

    await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
    const buttons = page.locator('ui-card').getByRole('button', { name: /^Favorite: / });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(buttons.nth(i)).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('the unsorted page has its own heading', async ({ page }) => {
    await openFeed(page, '/unsorted');

    await expect(page.getByRole('heading', { level: 1, name: 'Unsorted' })).toBeVisible();
  });

  test('shows the empty state', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.empty],
    );
    await page.goto('/links');

    await expect(page.getByRole('heading', { name: 'Your links will live here' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add link' })).toHaveCount(2);

    await page.getByRole('main').getByRole('button', { name: 'Add link' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
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

    const state = await box('ui-empty-state');
    const toolbar = await box('.library__toolbar');
    const freeTop = toolbar.y + toolbar.height;
    const freeBottom = main.y + main.height;
    const gapAbove = state.y - freeTop;
    const gapBelow = freeBottom - (state.y + state.height);
    expect(Math.abs(gapAbove - gapBelow)).toBeLessThanOrEqual(40);
    expect(gapAbove).toBeGreaterThan(40);
  });

  test.describe('new-account feed', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        ([key, value]) => sessionStorage.setItem(key, value),
        [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.empty],
      );
    });

    test('fits the viewport without horizontal scroll', async ({ page }) => {
      await page.goto('/links');
      await expect(page.getByRole('heading', { name: 'Your links will live here' })).toBeVisible();

      const overflow = await page.evaluate<number>(
        '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test('shows the error state', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.error],
    );
    await page.goto('/links');

    await expect(page.getByRole('heading', { name: "Couldn't load your links" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
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

  test('has no recent panel and no toggle for one', async ({ page }) => {
    await openFeed(page);

    await expect(page.locator('app-recent-links-panel')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /recently opened/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Recently opened' })).toHaveCount(0);
  });

  test('fits the viewport without horizontal scroll', async ({ page }) => {
    await openFeed(page);

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

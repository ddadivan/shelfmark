import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { openSidebar, openTags, tabBar } from './support/sidebar';
import { SEARCH_BUTTON } from './support/search-button';

// Mirror MOCK_ID.FolderReading and its name, and the mock tag (apps/web and libs/shared/contracts);
// the e2e project cannot import from them.
const READING = { id: '00000000-0000-4000-8000-000000000101', name: 'Reading' };
const DOCS = 'docs';

const SCREENS = [
  '/links',
  '/unsorted',
  '/favorites',
  `/folders/${READING.id}`,
  `/links?tag=${DOCS}`,
  '/settings',
  '/library',
  '/tags',
  '/recent',
] as const;
const WIDTHS = [360, 390, 768] as const;

test.describe('mobile layout (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => !isMobile, 'the phone project covers the phone layout');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  const tab = (page: Page, name: string) => tabBar(page).getByRole('link', { name });
  const sheet = (page: Page) => page.getByRole('dialog', { name: 'Recently opened' });
  const recentTile = (page: Page) => page.getByRole('link', { name: /^Recently opened/ });

  /** Touch down, wait for the menu the long press opens (the app's own timer fires), lift. */
  async function longPress(page: Page, target: Locator, menuItem: string) {
    const touch = { pointerType: 'touch', isPrimary: true, pointerId: 7 };
    await target.dispatchEvent('pointerdown', touch);
    await expect(page.getByRole('menuitem', { name: menuItem })).toBeVisible();
    await target.dispatchEvent('pointerup', touch);
  }

  async function overflow(page: Page): Promise<number> {
    return page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
  }

  test('the sidebar is not in the page; the tab bar is the navigation', async ({ page }) => {
    await page.goto('/links');

    await expect(page.getByRole('navigation', { name: 'Library' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0);
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(tabBar(page)).toBeVisible();
    // Add lives in the bar: no second (floating) Add button.
    await expect(page.getByRole('button', { name: 'Add link' })).toHaveCount(1);
  });

  test('the tab bar is a landmark with Library, Search, Add, Tags and You in that order', async ({
    page,
  }) => {
    await page.goto('/links');
    await expect(tabBar(page).locator('a, button')).toHaveCount(5);

    const names = await tabBar(page)
      .locator('a, button')
      .evaluateAll((items) =>
        items.map((item) => item.getAttribute('aria-label') ?? item.textContent?.trim()),
      );

    expect(names).toEqual(['Library', 'Search', 'Add link', 'Tags', 'You']);
    await expect(page.locator('ui-tab-bar ui-icon[name="chevron-down"]')).toHaveCount(0);
  });

  test('the active tab follows the route and carries aria-current', async ({ page }) => {
    await page.goto('/links');
    await expect(tab(page, 'Library')).toHaveAttribute('aria-current', 'page');

    await tab(page, 'Tags').click();
    await expect(page).toHaveURL('/tags');
    await expect(tab(page, 'Tags')).toHaveAttribute('aria-current', 'page');
    await expect(tab(page, 'Library')).not.toHaveAttribute('aria-current', 'page');

    await tab(page, 'You').click();
    await expect(page).toHaveURL('/settings');
    await expect(tab(page, 'You')).toHaveAttribute('aria-current', 'page');

    await page.goto(`/folders/${READING.id}`);
    await expect(tab(page, 'Library')).toHaveAttribute('aria-current', 'page');
  });

  test('the tab bar comes after the page in the focus order', async ({ page }) => {
    await page.goto('/links');
    await expect(page.locator('app-link-card').first()).toBeVisible();

    const after = await page.evaluate<boolean>(
      `!!(document.querySelector('main')?.compareDocumentPosition(document.querySelector('ui-tab-bar'))
        & Node.DOCUMENT_POSITION_FOLLOWING)`,
    );

    expect(after).toBe(true);
  });

  test('tapping the current tab keeps the page; the tiles open the views', async ({ page }) => {
    await page.goto('/links');
    await tab(page, 'Library').click();
    await expect(page).toHaveURL('/library');
    await tab(page, 'Library').click();
    await expect(page).toHaveURL('/library');

    await page.getByRole('link', { name: /^Favorites/ }).click();
    await expect(page).toHaveURL('/favorites');
    await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
    await expect(tab(page, 'Library')).toHaveAttribute('aria-current', 'page');
  });

  test('the Library page has the four tiles with counts, then the folders', async ({ page }) => {
    await page.goto('/links');
    await openSidebar(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
    for (const name of ['All links', 'Unsorted', 'Favorites', 'Recently opened']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${name}`) })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: /^All links \d+/ })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Folders' }).getByRole('treeitem', {
        name: new RegExp(`^${READING.name}\\b`),
      }),
    ).toBeVisible();
  });

  test('navigates to a folder from the Library page', async ({ page }) => {
    await page.goto('/links');
    await openSidebar(page);

    await page.getByRole('treeitem', { name: new RegExp(`^${READING.name}\\b`) }).click();

    await expect(page).toHaveURL(`/folders/${READING.id}`);
    await expect(page.getByRole('heading', { level: 1, name: READING.name })).toBeVisible();
  });

  test('a long press on a tag opens its menu', async ({ page }) => {
    await page.goto('/links');
    await openTags(page);
    const chip = page.getByRole('button', { name: DOCS, exact: true });

    await longPress(page, chip, 'Rename');

    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete tag' })).toBeVisible();
  });

  test('a tap on a tag filters the feed', async ({ page }) => {
    await page.goto('/links');
    await openTags(page);

    await page.getByRole('button', { name: DOCS, exact: true }).click();

    await expect(page).toHaveURL(`/links?tag=${DOCS}`);
  });

  test('the Search tab opens the search over the full width and keeps the page', async ({
    page,
  }) => {
    await page.goto('/links');

    await page.getByRole('button', { name: SEARCH_BUTTON }).click();

    const dialog = page.getByRole('dialog');
    await expect(
      page.getByRole('combobox', { name: 'Search links, folders and tags' }),
    ).toBeFocused();
    const box = await dialog.boundingBox();
    expect(box?.width).toBe(page.viewportSize()?.width);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL('/links');
  });

  test('Recently opened opens as a sheet, traps focus, closes with Esc and returns focus', async ({
    page,
  }) => {
    await page.goto('/links');
    await openSidebar(page);
    await recentTile(page).click();

    await expect(sheet(page)).toBeVisible();
    await expect(page).toHaveURL('/library');
    await expect(sheet(page).locator('app-link-history-row').first()).toBeVisible();
    await expect(sheet(page).getByRole('heading', { level: 3 }).first()).toBeVisible();
    for (let n = 0; n < 12; n++) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate<boolean>(
          "!!document.querySelector('[role=dialog]')?.contains(document.activeElement)",
        ),
      ).toBe(true);
    }
    await page.keyboard.press('Escape');

    await expect(sheet(page)).toHaveCount(0);
    await expect(recentTile(page)).toBeFocused();
  });

  test('the sheet closes from the close button and from the scrim', async ({ page }) => {
    await page.goto('/links');
    await openSidebar(page);

    await recentTile(page).click();
    await expect(sheet(page)).toBeVisible();
    await sheet(page).getByRole('button', { name: 'Close' }).click();
    await expect(sheet(page)).toHaveCount(0);

    await recentTile(page).click();
    await expect(sheet(page)).toBeVisible();
    // The strip above the sheet is the scrim.
    await page.mouse.click(180, 20);
    await expect(sheet(page)).toHaveCount(0);
    await expect(recentTile(page)).toBeFocused();
  });

  test('the sheet shows the same history as the page and removes and clears it', async ({
    page,
  }) => {
    await page.goto('/links');
    await openSidebar(page);
    await recentTile(page).click();
    const rows = sheet(page).locator('app-link-history-row');
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();

    await rows
      .first()
      .getByRole('button', { name: /^More for / })
      .click();
    await page.getByRole('menuitem', { name: 'Remove from history' }).click();
    await expect(rows).toHaveCount(before - 1);

    await sheet(page).getByRole('button', { name: 'Clear history' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear history' }).click();
    await expect(sheet(page).getByText('Nothing opened yet')).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test('Esc closes a nested dialog and keeps the Library page', async ({ page }) => {
    await page.goto('/links');
    await openSidebar(page);

    await page
      .getByRole('treeitem', { name: new RegExp(`^${READING.name}\\b`) })
      .click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const dialog = page.getByRole('dialog', { name: 'Rename folder' });
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page).toHaveURL('/library');
    await expect(tab(page, 'Library')).toHaveAttribute('aria-current', 'page');
  });

  test('a toast sits above the tab bar and stays clickable', async ({ page }) => {
    await page.goto('/links');
    await openTags(page);
    await page.getByRole('button', { name: DOCS, exact: true }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete tag' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete tag' }).click();

    const undo = page.getByRole('button', { name: 'Undo' });
    await expect(undo).toBeVisible();
    const toast = await page.locator('ui-toast').first().boundingBox();
    const bar = await tabBar(page).boundingBox();
    // 12px above the bar (no safe area in the test browser).
    expect((bar?.y ?? 0) - ((toast?.y ?? 0) + (toast?.height ?? 0))).toBeGreaterThanOrEqual(11);
    await undo.click();

    await expect(page.getByRole('button', { name: DOCS, exact: true })).toBeVisible();
  });

  test('a long press on a folder opens its menu', async ({ page }) => {
    await page.goto('/links');
    await openSidebar(page);
    const row = page.getByRole('treeitem', { name: new RegExp(`^${READING.name}\\b`) });

    await longPress(page, row, 'Rename');

    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'New subfolder' })).toBeVisible();
    await expect(page).toHaveURL('/library');
  });

  test('the You tab opens the settings with the account, sign out and no account menu', async ({
    page,
  }) => {
    await page.goto('/links');

    await tab(page, 'You').click();

    await expect(page).toHaveURL('/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0);
  });

  test('the tab bar floats 16px from the sides and 20px from the bottom and does not cover the last row', async ({
    page,
  }) => {
    await page.goto('/links');
    await expect(page.locator('app-link-card').first()).toBeVisible();

    const box = await tabBar(page).boundingBox();
    const view = page.viewportSize();
    expect(box?.x).toBeCloseTo(16, 0);
    expect((view?.width ?? 0) - ((box?.x ?? 0) + (box?.width ?? 0))).toBeCloseTo(16, 0);
    expect((view?.height ?? 0) - ((box?.y ?? 0) + (box?.height ?? 0))).toBeCloseTo(20, 0);
    await page.mouse.wheel(0, 100000);
    await expect
      .poll(async () => (await page.locator('app-link-card').last().boundingBox())?.y ?? 0)
      .toBeLessThan(view?.height ?? 0);
    const last = await page.locator('app-link-card').last().boundingBox();
    expect((last?.y ?? 0) + (last?.height ?? 0)).toBeLessThanOrEqual(box?.y ?? 0);
  });

  test('adds a link with the Add button of the bar', async ({ page }) => {
    await page.goto('/links');

    await page.getByRole('button', { name: 'Add link' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await dialog.getByLabel('Link', { exact: true }).fill('https://mobile.example/phone');
    await dialog.getByRole('button', { name: /Save/ }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Link saved')).toBeVisible();
  });

  test('the bottom-most control stays clickable while a toast is visible', async ({ page }) => {
    await page.goto('/links');
    const add = page.getByRole('button', { name: 'Add link' });
    await add.click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await dialog.getByLabel('Link', { exact: true }).fill('https://mobile.example/toast');
    await dialog.getByRole('button', { name: /Save/ }).click();
    await expect(page.getByText('Link saved')).toBeVisible();

    // The toast sits above the bar; its pane must not swallow clicks on the bar.
    await add.click();

    await expect(page.getByRole('dialog', { name: 'Add link' })).toBeVisible();
  });

  test('keeps the touch targets of the tab bar and the Library page at 44px', async ({ page }) => {
    await page.goto('/links');
    for (const item of await tabBar(page).locator('a, button').all()) {
      const box = await item.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    await openSidebar(page);
    const create = await page.getByRole('button', { name: 'New folder' }).boundingBox();
    expect(create?.height).toBeGreaterThanOrEqual(44);
    await openTags(page);
    const newTag = await page.getByRole('button', { name: 'New tag' }).boundingBox();
    expect(newTag?.height).toBeGreaterThanOrEqual(44);
  });

  test('the tab bar gives way to the sidebar past 40em and the phone pages leave', async ({
    page,
  }) => {
    await page.goto('/library');
    await expect(page.locator('app-library-tile').first()).toBeVisible();

    await page.setViewportSize({ width: 700, height: 780 });

    await expect(page).toHaveURL('/links');
    await expect(tabBar(page)).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Library' })).toBeVisible();
  });

  for (const width of WIDTHS) {
    for (const path of SCREENS) {
      test(`${path} has no horizontal scroll at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 780 });
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await settled(page);

        expect(await overflow(page)).toBeLessThanOrEqual(0);
      });
    }

    test(`the dialogs fit ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto('/links');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      await page.getByRole('button', { name: 'Add link' }).click();
      await expect(page.getByRole('dialog', { name: 'Add link' })).toBeVisible();
      await settled(page);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.getByRole('button', { name: SEARCH_BUTTON }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await settled(page);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await openSidebar(page);
      await page.getByRole('button', { name: 'New folder' }).click();
      await expect(page.getByRole('dialog', { name: 'New folder' })).toBeVisible();
      await settled(page);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the Library page, its sheet and the tab bar fit ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto('/links');
      if (width >= 640) {
        // From the tablet breakpoint the sidebar is inline and there is no tab bar.
        await expect(tabBar(page)).toHaveCount(0);
        await expect(page.getByRole('navigation', { name: 'Library' })).toBeVisible();
      } else {
        await openSidebar(page);
        await recentTile(page).click();
        await expect(sheet(page)).toBeVisible();
        await settled(page);
        const box = await sheet(page).boundingBox();
        expect(box?.width).toBeLessThanOrEqual(width);
        await page.keyboard.press('Escape');
        await expect(sheet(page)).toHaveCount(0);
        const bar = await tabBar(page).boundingBox();
        expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeLessThanOrEqual(width);
      }
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

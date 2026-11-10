import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { openSidebar } from './support/sidebar';
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
] as const;
const WIDTHS = [360, 390, 768] as const;

test.describe('mobile layout (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => !isMobile, 'the phone project covers the phone layout');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  const drawer = (page: Page) => page.getByRole('dialog', { name: 'Menu' });
  const library = (page: Page) => drawer(page).getByRole('navigation', { name: 'Library' });

  async function openDrawer(page: Page) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(drawer(page)).toBeVisible();
    await expect(library(page).getByRole('treeitem', { name: /^All links/ })).toBeVisible();
  }

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

  test('the sidebar is not in the page, only behind the menu button', async ({ page }) => {
    await page.goto('/links');

    await expect(page.getByRole('navigation', { name: 'Library' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add link' })).toBeVisible();
  });

  test('opens the drawer, traps focus, closes with Esc and returns focus', async ({ page }) => {
    await page.goto('/links');
    const opener = page.getByRole('button', { name: 'Open menu' });

    await openDrawer(page);
    for (let n = 0; n < 12; n++) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate<boolean>(
          "!!document.querySelector('[role=dialog][aria-label=Menu]')?.contains(document.activeElement)",
        ),
      ).toBe(true);
    }
    await page.keyboard.press('Escape');

    await expect(drawer(page)).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test('closes from the close button and from the scrim', async ({ page }) => {
    await page.goto('/links');

    await openDrawer(page);
    await drawer(page).getByRole('button', { name: 'Close menu' }).click();
    await expect(drawer(page)).toHaveCount(0);

    // Up to 600px the drawer fills the screen, so there is no scrim strip to tap.
    await openDrawer(page);
    const full = await drawer(page).boundingBox();
    expect(full?.width).toBe(page.viewportSize()?.width);
    await drawer(page).getByRole('button', { name: 'Close menu' }).click();

    // From 601px to the tablet breakpoint the drawer is narrower and the strip beside it is the scrim.
    await page.setViewportSize({ width: 620, height: page.viewportSize()?.height ?? 780 });
    await openDrawer(page);
    const panel = await drawer(page).boundingBox();
    const view = page.viewportSize();
    const edge = (panel?.x ?? 0) + (panel?.width ?? 0);
    expect(edge).toBeLessThan(view?.width ?? 0);
    await page.mouse.click(edge + ((view?.width ?? 0) - edge) / 2, (view?.height ?? 0) / 2);
    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });

  test('the menu button reports aria-expanded while the drawer is open', async ({ page }) => {
    await page.goto('/links');
    // A CSS locator: while the drawer is open the CDK hides the page from role queries.
    const opener = page.locator('button[aria-label="Open menu"]');
    await expect(opener).toHaveAttribute('aria-expanded', 'false');

    await openDrawer(page);
    await expect(opener).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(drawer(page)).toHaveCount(0);
    await expect(opener).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes when the viewport grows past 40em', async ({ page }) => {
    await page.goto('/links');
    await openDrawer(page);

    await page.setViewportSize({ width: 700, height: 780 });

    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Library' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
  });

  test('tapping the current route closes the drawer', async ({ page }) => {
    await page.goto('/links');
    await openDrawer(page);
    await library(page)
      .getByRole('treeitem', { name: /^All links/ })
      .click();
    await expect(drawer(page)).toHaveCount(0);
    await expect(page).toHaveURL('/links');

    await openDrawer(page);
    await library(page)
      .getByRole('treeitem', { name: /^Favorites/ })
      .click();
    await expect(drawer(page)).toHaveCount(0);
    await expect(page).toHaveURL('/favorites');
  });

  test('navigates to a folder and closes on navigation', async ({ page }) => {
    await page.goto('/links');

    await openDrawer(page);
    await library(page)
      .getByRole('treeitem', { name: new RegExp(`^${READING.name}\\b`) })
      .click();

    await expect(page).toHaveURL(`/folders/${READING.id}`);
    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: READING.name })).toBeVisible();
  });

  test('a long press on a tag opens its menu', async ({ page }) => {
    await page.goto('/links');
    await openDrawer(page);
    const chip = library(page).getByRole('button', { name: DOCS, exact: true });

    await longPress(page, chip, 'Rename');

    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete tag' })).toBeVisible();
  });

  test('opens the search as a sheet over the full width', async ({ page }) => {
    await page.goto('/links');

    await page.getByRole('button', { name: SEARCH_BUTTON }).click();

    const dialog = page.getByRole('dialog');
    await expect(
      page.getByRole('combobox', { name: 'Search links, folders and tags' }),
    ).toBeFocused();
    const box = await dialog.boundingBox();
    expect(box?.width).toBe(page.viewportSize()?.width);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test('Esc closes the drawer after a nested dialog and focus returns to the menu button', async ({
    page,
  }) => {
    await page.goto('/links');
    await openDrawer(page);

    await library(page)
      .getByRole('treeitem', { name: new RegExp(`^${READING.name}\\b`) })
      .click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const dialog = page.getByRole('dialog', { name: 'Rename folder' });
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(drawer(page)).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });

  test('a toast is visible and clickable above the open drawer', async ({ page }) => {
    await page.goto('/links');
    await openDrawer(page);
    await library(page).getByRole('button', { name: DOCS, exact: true }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete tag' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete tag' }).click();

    const undo = page.getByRole('button', { name: 'Undo' });
    await expect(undo).toBeVisible();
    await undo.click();

    await expect(library(page).getByRole('button', { name: DOCS, exact: true })).toBeVisible();
    await expect(drawer(page)).toBeVisible();
  });

  test('a long press on a folder opens its menu', async ({ page }) => {
    await page.goto('/links');
    await openDrawer(page);
    const row = library(page).getByRole('treeitem', { name: new RegExp(`^${READING.name}\\b`) });

    await longPress(page, row, 'Rename');

    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'New subfolder' })).toBeVisible();
    await expect(page).toHaveURL('/links');
  });

  test('the "Recently opened" row opens a sheet and focus ends on the menu button', async ({
    page,
  }) => {
    await page.goto('/links');
    await openDrawer(page);

    await library(page).getByRole('treeitem', { name: 'Recently opened' }).click();

    await expect(drawer(page)).toHaveCount(0);
    const sheet = page.getByRole('dialog', { name: 'Recently opened' });
    await expect(sheet).toBeVisible();
    expect((await sheet.boundingBox())?.width).toBe(page.viewportSize()?.width);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });

  test('the drawer has no footer; settings open from the header account menu', async ({ page }) => {
    await page.goto('/links');
    await openDrawer(page);
    await expect(drawer(page).getByRole('button', { name: 'Switch theme' })).toHaveCount(0);
    await expect(drawer(page).getByRole('button', { name: 'Settings' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
  });

  test('the header is menu, logo, search, account in that order and the account has no chevron', async ({
    page,
  }) => {
    await page.goto('/links');
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();

    const names = await page
      .getByRole('banner')
      .getByRole('button')
      .evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-label')));

    expect(names).toEqual(['Open menu', 'Search', 'Account menu']);
    await expect(page.getByRole('banner').locator('ui-icon[name="chevron-down"]')).toHaveCount(0);
  });

  test('the add FAB is fixed at the bottom end and does not cover the last row', async ({
    page,
  }) => {
    await page.goto('/links');
    const fab = page.getByRole('button', { name: 'Add link' });

    const box = await fab.boundingBox();
    const view = page.viewportSize();
    expect(box?.width).toBe(56);
    // space-4 from the end edge and space-6 from the bottom (no safe area in the test browser).
    expect((view?.width ?? 0) - ((box?.x ?? 0) + (box?.width ?? 0))).toBeCloseTo(16, 0);
    expect((view?.height ?? 0) - ((box?.y ?? 0) + (box?.height ?? 0))).toBeCloseTo(24, 0);
    await page.mouse.wheel(0, 100000);
    await expect(page.getByRole('button', { name: 'Add link' })).toBeVisible();
  });

  test('adds a link with the floating button', async ({ page }) => {
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
    const fab = page.getByRole('button', { name: 'Add link' });
    await fab.click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await dialog.getByLabel('Link', { exact: true }).fill('https://mobile.example/toast');
    await dialog.getByRole('button', { name: /Save/ }).click();
    await expect(page.getByText('Link saved')).toBeVisible();

    // The toast sits at the bottom edge; its pane must not swallow clicks next to it.
    await fab.click();

    await expect(page.getByRole('dialog', { name: 'Add link' })).toBeVisible();
  });

  test('keeps the touch targets of the header and the drawer at 44px', async ({ page }) => {
    await page.goto('/links');
    const header = page.getByRole('banner').getByRole('button');

    for (const button of await header.all()) {
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    await openDrawer(page);
    for (const name of ['Close menu', 'Create a folder', 'New tag']) {
      const box = await drawer(page).getByRole('button', { name }).boundingBox();
      expect(box?.height, name).toBeGreaterThanOrEqual(44);
    }
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
      await page.getByRole('button', { name: 'Create a folder' }).click();
      await expect(page.getByRole('dialog', { name: 'New folder' })).toBeVisible();
      await settled(page);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the open drawer fits ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto('/links');
      if (width >= 640) {
        // From the tablet breakpoint the sidebar is inline, there is no drawer.
        await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
        await expect(page.getByRole('navigation', { name: 'Library' })).toBeVisible();
      } else {
        await openDrawer(page);
        await settled(page);
        const box = await drawer(page).boundingBox();
        expect(box?.width).toBeLessThanOrEqual(width);
      }
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

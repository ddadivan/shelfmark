import { expect, test, type Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';

// Mirror MOCK_ID.FolderReading and its name, and the mock tag (apps/web and libs/shared/contracts);
// the e2e project cannot import from them.
const READING = { id: '00000000-0000-4000-8000-000000000101', name: 'Reading' };
const DOCS = 'docs';
const LONG_PRESS_MS = 800;

const SCREENS = [
  '/links',
  '/unsorted',
  '/favorites',
  `/folders/${READING.id}`,
  '/settings',
] as const;
const WIDTHS = [360, 390, 768] as const;

test.describe('mobile layout (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => !isMobile, 'the phone project covers the phone layout');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  /** Waits for the enter animations: axe measures contrast on the painted colors. */
  async function settled(page: Page) {
    // String script: this project has no DOM lib, and the code runs in the browser anyway.
    await page.evaluate(
      'Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))',
    );
  }

  const drawer = (page: Page) => page.getByRole('dialog', { name: 'Menu' });
  const library = (page: Page) => drawer(page).getByRole('navigation', { name: 'Library' });

  async function openDrawer(page: Page) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(drawer(page)).toBeVisible();
    await expect(library(page).getByRole('treeitem', { name: /^All links/ })).toBeVisible();
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
      expect(await drawer(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
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

    await openDrawer(page);
    await page.mouse.click(350, 400);
    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
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

    await chip.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 7,
    });
    await page.waitForTimeout(LONG_PRESS_MS);
    await chip.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true, pointerId: 7 });

    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete tag' })).toBeVisible();
  });

  test('opens the search as a sheet over the full width', async ({ page }) => {
    await page.goto('/links');

    await page.getByRole('button', { name: 'Search', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(
      page.getByRole('combobox', { name: 'Search links, folders and tags' }),
    ).toBeFocused();
    const box = await dialog.boundingBox();
    expect(box?.width).toBe(page.viewportSize()?.width);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
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

  test('keeps the touch targets of the header and the drawer at 44px', async ({ page }) => {
    await page.goto('/links');
    const header = page.getByRole('banner').getByRole('button');

    for (const button of await header.all()) {
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    await openDrawer(page);
    for (const name of ['Close menu', 'New folder', 'New tag']) {
      const box = await drawer(page).getByRole('button', { name }).boundingBox();
      expect(box?.height, name).toBeGreaterThanOrEqual(44);
    }
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      test('the open drawer has no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        await page.goto('/links');
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);

        await openDrawer(page);
        await settled(page);

        await expectNoBlockingViolations(page, testInfo, {
          include: '[role="dialog"]',
          disabledRules: ['label-content-name-mismatch'],
        });
      });
    });
  }

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

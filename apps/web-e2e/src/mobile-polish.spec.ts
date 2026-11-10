import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { SEARCH_BUTTON } from './support/search-button';
import { openSidebar, tabBar } from './support/sidebar';

// Mirror MOCK_ID.FolderReading / FolderAngular and their names (libs/shared/contracts); the e2e
// project cannot import from them.
const READING = { id: '00000000-0000-4000-8000-000000000101', name: 'Reading' };
const ANGULAR = { id: '00000000-0000-4000-8000-000000000102', name: 'Angular' };

test.describe('mobile polish (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test.describe('subfolders in a folder view', () => {
    test('lists the child folder as a link and opens it', async ({ page }) => {
      await page.goto(`/folders/${READING.id}`);

      const tile = page.getByRole('link', { name: /^Open folder Angular, \d+ links?/ });
      await expect(tile).toBeVisible();
      await expect(tile).toHaveAttribute('href', `/folders/${ANGULAR.id}`);
      await tile.click();

      await expect(page).toHaveURL(`/folders/${ANGULAR.id}`);
      await expect(page.getByRole('heading', { level: 1, name: ANGULAR.name })).toBeVisible();
    });

    test('opens with the keyboard in the list view', async ({ page }) => {
      await page.goto(`/folders/${READING.id}`);
      await page.getByRole('radio', { name: 'List' }).check({ force: true });

      const tile = page.getByRole('link', { name: /^Open folder Angular/ });
      await tile.focus();
      await expect(tile).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(`/folders/${ANGULAR.id}`);
    });

    test('has no horizontal overflow', async ({ page }) => {
      await page.goto(`/folders/${READING.id}`);
      await expect(page.getByRole('link', { name: /^Open folder Angular/ })).toBeVisible();

      const overflow = await page.evaluate<number>(
        '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test.describe('phone only', () => {
    test.skip(({ isMobile }) => !isMobile, 'the phone project covers the phone layout');

    test('the tab bar stays at the bottom while the page scrolls', async ({ page }) => {
      await page.goto('/links');
      const bar = tabBar(page);
      await expect(bar).toBeVisible();
      // Make sure the page is taller than the screen, whatever the mock data size.
      await page.addStyleTag({ content: 'main { min-height: 3000px; }' });

      await page.evaluate('window.scrollTo(0, 1200)');
      await expect.poll(() => page.evaluate('window.scrollY')).toBeGreaterThan(500);

      const box = await bar.boundingBox();
      const view = page.viewportSize();
      expect((view?.height ?? 0) - ((box?.y ?? 0) + (box?.height ?? 0))).toBeCloseTo(20, 0);
      await expect(page.getByRole('button', { name: 'Add link' })).toBeInViewport();
    });

    test('a dialog and the sheet stay above the tab bar', async ({ page }) => {
      await page.goto('/links');
      await page.addStyleTag({ content: 'main { min-height: 3000px; }' });
      await page.evaluate('window.scrollTo(0, 800)');

      await page.getByRole('button', { name: 'Add link' }).click();
      await expect(page.getByRole('dialog', { name: 'Add link' })).toBeVisible();
      await settled(page);
      // String script: this project has no DOM lib. The bar sits under the dialog's scrim.
      const covered = `(() => { const r = document.querySelector('ui-tab-bar').getBoundingClientRect();
        return !document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('ui-tab-bar'); })()`;
      expect(await page.evaluate<boolean>(covered)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await openSidebar(page);
      await page.getByRole('link', { name: /^Recently opened/ }).click();
      await expect(page.getByRole('dialog', { name: 'Recently opened' })).toBeVisible();
      await settled(page);
      expect(await page.evaluate<boolean>(covered)).toBe(true);
    });

    test('the search dialog has no keyboard hints', async ({ page }) => {
      await page.goto('/links');
      await page.getByRole('button', { name: SEARCH_BUTTON }).click();
      const dialog = page.getByRole('dialog', { name: 'Search' });
      await expect(dialog).toBeVisible();
      await settled(page);

      await expect(dialog.locator('.ui-command-list__field kbd')).toBeHidden();
      await expect(dialog.getByText('Esc', { exact: true })).toBeHidden();
      // Hidden, not removed: the hints stay readable for a screen reader with a keyboard.
      await expect(dialog.locator('.ui-command-list__footer')).toContainText('move');
      const box = await dialog.locator('.ui-command-list__footer').boundingBox();
      expect(box?.height).toBeLessThanOrEqual(1);
    });

    test('the search dialog fills the whole screen', async ({ page }) => {
      await page.goto('/links');
      await page.getByRole('button', { name: SEARCH_BUTTON }).click();
      const panel = page.getByRole('dialog', { name: 'Search' }).locator('.ui-dialog');
      await expect(panel).toBeVisible();
      await settled(page);

      const box = await panel.boundingBox();
      const view = page.viewportSize();
      expect(box?.y).toBeLessThanOrEqual(1);
      expect(Math.round(box?.height ?? 0)).toBe(view?.height);
      expect(Math.round(box?.width ?? 0)).toBe(view?.width);
    });

    test('the add link sheet has no Cancel, the close button and Esc still dismiss it', async ({
      page,
    }) => {
      await page.goto('/links');
      await page.getByRole('button', { name: 'Add link' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await expect(dialog).toBeVisible();
      await settled(page);

      await expect(dialog.getByRole('button', { name: 'Save link' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeHidden();

      await dialog.getByRole('button', { name: 'Close' }).click();
      await expect(dialog).toBeHidden();

      await page.getByRole('button', { name: 'Add link' }).click();
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    });

    test('the tap highlight is off', async ({ page }) => {
      await page.goto('/links');

      const color = await page.evaluate<string>(
        "getComputedStyle(document.documentElement).getPropertyValue('-webkit-tap-highlight-color')",
      );
      expect(['transparent', 'rgba(0, 0, 0, 0)']).toContain(color);
    });
  });

  test.describe('desktop and tablet', () => {
    test.skip(({ isMobile }) => isMobile, 'the desktop project covers the keyboard hints');

    test('the search dialog keeps the keyboard hints', async ({ page }) => {
      await page.goto('/links');
      await page.getByRole('button', { name: SEARCH_BUTTON }).click();
      const dialog = page.getByRole('dialog', { name: 'Search' });
      await expect(dialog).toBeVisible();

      await expect(dialog.getByText('Esc', { exact: true })).toBeVisible();
      const box = await dialog.locator('.ui-command-list__footer').boundingBox();
      expect(box?.height).toBeGreaterThan(20);
    });
  });
});

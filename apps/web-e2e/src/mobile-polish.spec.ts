import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';

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

    test('the header stays at the top while the page scrolls', async ({ page }) => {
      await page.goto('/links');
      const header = page.getByRole('banner');
      await expect(header).toBeVisible();
      // Make sure the page is taller than the screen, whatever the mock data size.
      await page.addStyleTag({ content: 'main { min-height: 3000px; }' });

      await page.evaluate('window.scrollTo(0, 1200)');
      await expect.poll(() => page.evaluate('window.scrollY')).toBeGreaterThan(500);

      const box = await header.boundingBox();
      expect(box?.y).toBeCloseTo(0, 0);
      await expect(page.getByRole('button', { name: 'Open menu' })).toBeInViewport();
    });

    test('a dialog and the drawer stay above the sticky header', async ({ page }) => {
      await page.goto('/links');
      await page.addStyleTag({ content: 'main { min-height: 3000px; }' });
      await page.evaluate('window.scrollTo(0, 800)');

      await page.getByRole('button', { name: 'Open menu' }).click();
      const drawer = page.getByRole('dialog', { name: 'Menu' });
      await expect(drawer).toBeVisible();
      // String script: this project has no DOM lib. The header sits under the drawer's scrim.
      const top = await page.evaluate<string>(
        `document.elementFromPoint(40, 40)?.closest('[role="dialog"]')?.getAttribute('aria-label') ?? 'none'`,
      );
      expect(top).toBe('Menu');
    });

    test('the search dialog has no keyboard hints', async ({ page }) => {
      await page.goto('/links');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
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
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      const panel = page.getByRole('dialog', { name: 'Search' }).locator('.ui-dialog');
      await expect(panel).toBeVisible();
      await settled(page);

      const box = await panel.boundingBox();
      const view = page.viewportSize();
      expect(box?.y).toBeLessThanOrEqual(1);
      expect(Math.round(box?.height ?? 0)).toBe(view?.height);
      expect(Math.round(box?.width ?? 0)).toBe(view?.width);
    });

    test('the add link dialog stacks its actions, the main action on top', async ({ page }) => {
      await page.goto('/links');
      await page.getByRole('button', { name: 'Add link' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await expect(dialog).toBeVisible();
      await settled(page);

      const save = await dialog.getByRole('button', { name: 'Save link' }).boundingBox();
      const cancel = await dialog.getByRole('button', { name: 'Cancel' }).boundingBox();
      expect(save && cancel).toBeTruthy();
      expect(save?.y).toBeLessThan(cancel?.y ?? 0);
      expect(save?.width).toBeCloseTo(cancel?.width ?? 0, 0);
      expect(save?.x).toBeCloseTo(cancel?.x ?? 0, 0);
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
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Search' });
      await expect(dialog).toBeVisible();

      await expect(dialog.getByText('Esc', { exact: true })).toBeVisible();
      const box = await dialog.locator('.ui-command-list__footer').boundingBox();
      expect(box?.height).toBeGreaterThan(20);
    });
  });
});

import { readFile } from 'node:fs/promises';
import { dataRow, openDataMenu, openYouTab } from './support/data-menu';
import { openSendFeedback } from './support/feedback';
import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';

// Mirrors EXPORT_MOCK_MARKER (apps/web); this project cannot import it.
const MOCK_MARKER = 'sm-mock-export';

// #387, ADR 0056 decision 11: Import and export open from the "Data & help" row of the sidebar
// footer (desktop) and from the Import / Export group of the You tab (phone), both as dialogs.
test.describe('data menu and its entries (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test.describe('desktop sidebar', () => {
    test.beforeEach(({ page }) => {
      test.skip(isCompact(page), 'the sidebar footer exists from 64em');
    });

    test('the menu opens upwards from the row and lists the four entries', async ({ page }) => {
      await page.goto('/links');
      const row = dataRow(page);
      await expect(row).toBeVisible();
      const menu = await openDataMenu(page);

      const items = menu.getByRole('menuitem');
      await expect(items).toHaveText(['Import links', 'Export', /What's new/, 'Send feedback']);
      const rowBox = await row.boundingBox();
      const menuBox = await menu.boundingBox();
      expect(rowBox && menuBox && menuBox.y + menuBox.height <= rowBox.y + 1).toBe(true);
      // Trash stays its own row under the data row.
      await expect(page.getByRole('treeitem', { name: /^Trash/ })).toBeVisible();
    });

    test('opens with the keyboard and Escape gives focus back to the row', async ({ page }) => {
      await page.goto('/links');
      await dataRow(page).focus();
      await page.keyboard.press('ArrowUp');
      const menu = page.getByRole('menu', { name: 'Data and help' });
      await expect(menu).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: 'Send feedback' })).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(dataRow(page)).toBeFocused();
    });

    test('Import opens the import dialog', async ({ page }) => {
      await page.goto('/links');
      const menu = await openDataMenu(page);
      await menu.getByRole('menuitem', { name: 'Import links' }).click();

      await expect(page.getByRole('dialog', { name: 'Import links' })).toBeVisible();
    });

    test('Export opens the export dialog and downloads JSON', async ({ page }) => {
      await page.goto('/links');
      const menu = await openDataMenu(page);
      await menu.getByRole('menuitem', { name: 'Export' }).click();

      const dialog = page.getByRole('dialog', { name: 'Export' });
      await expect(dialog).toBeVisible();
      const download = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Download' }).click();
      const file = await download;

      expect(file.suggestedFilename()).toMatch(/^shelfmark-\d{4}-\d{2}-\d{2}\.json$/);
      const lines = (await readFile(await file.path(), 'utf8')).split('\n');
      expect(lines[0]).toBe(MOCK_MARKER);
      expect(lines[1]).toBe('/api/export?format=json');
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('ui-toast')).toContainText('File saved');
    });

    test("What's new and Send feedback still open", async ({ page }) => {
      await page.goto('/links');
      let menu = await openDataMenu(page);
      await menu.getByRole('menuitem', { name: "What's new" }).click();
      const whatsNew = page.getByRole('dialog', { name: "What's new in Shelfmark" });
      await expect(whatsNew).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(whatsNew).toHaveCount(0);

      menu = await openDataMenu(page);
      await menu.getByRole('menuitem', { name: 'Send feedback' }).click();
      await expect(page.getByRole('dialog', { name: 'Send feedback' })).toBeVisible();
    });

    test('the account menu no longer has import or whole-library export', async ({ page }) => {
      await page.goto('/links');
      await page.getByRole('button', { name: 'Account menu' }).click();

      await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Import links/ })).toHaveCount(0);
      await expect(page.getByRole('menuitem', { name: /^Everything as/ })).toHaveCount(0);
    });
  });

  test.describe('phone You tab', { tag: E2E_TAG.Phone }, () => {
    test.beforeEach(({ page }) => {
      test.skip(!isCompact(page), 'the You tab exists below 64em');
    });

    test('has an Import / Export group; both open as bottom sheets', async ({ page }) => {
      await page.goto('/links');
      await openYouTab(page);
      const group = page.getByRole('group', { name: 'Import and export' });
      await expect(group.getByRole('link')).toHaveText([/Import links/, /Export/]);

      await group.getByRole('link', { name: 'Import links' }).click();
      const importDialog = page.getByRole('dialog', { name: 'Import links' });
      await expect(importDialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(importDialog).toHaveCount(0);

      await group.getByRole('link', { name: 'Export' }).click();
      const exportDialog = page.getByRole('dialog', { name: 'Export' });
      await expect(exportDialog).toBeVisible();
      const box = await exportDialog.boundingBox();
      const viewport = page.viewportSize();
      // A bottom sheet touches the bottom edge of the screen.
      expect(box && viewport && Math.abs(box.y + box.height - viewport.height) <= 2).toBe(true);
    });

    test('Send feedback stays under the group', async ({ page }) => {
      await page.goto('/links');
      const dialog = await openSendFeedback(page);
      await expect(dialog).toBeVisible();
    });
  });
});

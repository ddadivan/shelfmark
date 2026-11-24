import { readFile } from 'node:fs/promises';
import { openDataDialog } from './support/data-menu';
import { seedSession } from './support/mock-session';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';

// #387: the "Export" dialog of the data menu / You tab exports the whole library.
test.describe('export dialog (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test(
    'chooses Bookmarks HTML, downloads it, shows the toast and remembers it',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await page.goto('/links');
      await openDataDialog(page, 'Export');
      const dialog = page.getByRole('dialog', { name: 'Export' });
      await expect(dialog.getByRole('radio', { name: /^JSON/ })).toBeChecked();
      await expect(dialog).not.toContainText('Last export');

      await dialog.getByText('Bookmarks HTML', { exact: true }).click();
      await expect(dialog.getByRole('radio', { name: /^Bookmarks HTML/ })).toBeChecked();
      const download = page.waitForEvent('download');
      await dialog.getByRole('button', { name: /^Export / }).click();
      const file = await download;

      expect(file.suggestedFilename()).toMatch(/^shelfmark-\d{4}-\d{2}-\d{2}\.html$/);
      expect((await readFile(await file.path(), 'utf8')).split('\n')[1]).toBe(
        '/api/export?format=html',
      );
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('ui-toast')).toContainText('File saved');

      await page.locator('ui-toast').getByRole('button', { name: 'Dismiss' }).click();
      await openDataDialog(page, 'Export');
      await expect(page.getByRole('dialog', { name: 'Export' })).toContainText(
        /Last export: .*, HTML\./,
      );
    },
  );

  test('Cancel closes the dialog without a file', async ({ page }) => {
    await page.goto('/links');
    await openDataDialog(page, 'Export');
    const dialog = page.getByRole('dialog', { name: 'Export' });

    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.locator('ui-toast')).toHaveCount(0);
  });
});

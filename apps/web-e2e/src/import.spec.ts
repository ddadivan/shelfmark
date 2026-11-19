import { join } from 'node:path';
import { expect, test } from './support/test';
import { openSettingsSection, seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { openTrash, trashRow } from './support/trash';
import { E2E_TAG } from './models/e2e-tag.const';

// A real Chrome export (the parser's fixture in apps/web): 8 web links in nested folders, one
// repeated address, a bookmarklet and a chrome:// entry. Nx runs e2e from the workspace root.
const CHROME_EXPORT = join(
  process.cwd(),
  'apps/web/src/app/features/import/utils/fixtures/chrome-bookmarks.html',
);

// #387, ADR 0056: browser bookmarks in three steps, then Undo through Trash.
test.describe('import browser bookmarks (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test(
    'uploads a bookmarks file, reviews it, imports it and undoes it',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await page.goto('/settings/account');
      await page.getByRole('button', { name: 'Import', exact: true }).click();

      const dialog = page.getByRole('dialog', { name: 'Import links' });
      await expect(dialog.getByText('Browser bookmarks')).toBeVisible();
      // The picker button opens the hidden file input; Playwright fills it directly.
      await dialog.locator('input[type="file"]').setInputFiles(CHROME_EXPORT);

      // Step 2: the file name is the title; nothing is written yet.
      const review = page.getByRole('dialog', { name: 'chrome-bookmarks.html' });
      await expect(review.getByText('already on your shelf', { exact: true })).toBeVisible();
      await expect(review.getByRole('checkbox', { name: /^Skip the 1 duplicate/ })).toBeChecked();
      await expect(
        review.getByRole('checkbox', { name: /^Keep the folder structure/ }),
      ).toBeChecked();
      await review.getByRole('button', { name: 'Import 7 links' }).click();

      // Step 3: the summary.
      await expect(page.getByText('7 links imported')).toBeVisible();
      await expect(page.getByText(/In “Imported bookmarks”\. 6 folders\./)).toBeVisible();

      // The new folder holds the file's folders.
      await page.getByRole('button', { name: 'Open the folder' }).click();
      await expect(page).toHaveURL(/\/folders\/[0-9a-f-]+$/);
      await expect(page.getByRole('heading', { name: 'Imported bookmarks' })).toBeVisible();

      // Recent imports offers Undo for 7 days; Undo asks first, then everything goes to Trash.
      // In-app navigation: a reload would start the mock library over.
      await openSettingsSection(page, 'Account');
      const recent = page.getByRole('group', { name: 'Recent imports' });
      await expect(recent.getByText('chrome-bookmarks.html')).toBeVisible();
      await recent.getByRole('button', { name: 'Undo import: chrome-bookmarks.html' }).click();
      const confirm = page.getByRole('dialog', { name: 'Undo this import?' });
      await confirm.getByRole('button', { name: 'Undo import' }).click();
      await expect(page.getByText('Import undone')).toBeVisible();
      await expect(recent).toHaveCount(0);

      // One Trash entry: the import's folder with everything inside.
      if (!isCompact(page)) {
        // Settings has its own navigation: back to the library sidebar first.
        await page.getByRole('link', { name: 'Back to links' }).click();
      }
      await openTrash(page);
      await expect(trashRow(page, 'Imported bookmarks')).toHaveCount(1);
    },
  );

  test('refuses a file that is not a bookmarks export', async ({ page }) => {
    await page.goto('/settings/account');
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Import links' });
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('just some notes'),
    });
    await expect(dialog.getByRole('alert')).toContainText('This is not a bookmarks file');
  });
});

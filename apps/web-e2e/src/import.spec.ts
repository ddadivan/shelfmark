import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedAi } from './support/ai';
import { openDataDialog } from './support/data-menu';
import { seedSession } from './support/mock-session';
import { isPhone } from './support/sidebar';
import { openTrash, trashRow } from './support/trash';
import { E2E_TAG } from './models/e2e-tag.const';

// A real Chrome export (the parser's fixture in apps/web): 8 web links in nested folders, one
// repeated address, a bookmarklet and a chrome:// entry. Nx runs e2e from the workspace root.
const CHROME_EXPORT = join(
  process.cwd(),
  'apps/web/src/app/features/import/utils/fixtures/chrome-bookmarks.html',
);

/** Opens "Import links" from the library: the sidebar's Data & help menu, or the You tab on a phone. */
async function openImport(page: Page) {
  await page.goto('/links');
  return reopenImport(page);
}

/** Opens the dialog again without a page load (a reload would start the mock library over). */
async function reopenImport(page: Page) {
  await openDataDialog(page, 'Import links');
  const dialog = page.getByRole('dialog', { name: 'Import links' });
  await expect(dialog).toBeVisible();
  return dialog;
}

// #387, ADR 0056: browser bookmarks in three steps (and AI groups in between), then Undo through Trash.
test.describe('import browser bookmarks (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test(
    'imports a bookmarks file as it is, then undoes it from Recent imports',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      const dialog = await openImport(page);

      // Step 1: the browser source, the drop zone with the real limits and the short help.
      await expect(dialog.getByText('Browser bookmarks')).toBeVisible();
      await expect(dialog.getByText('Drag the file here')).toBeVisible();
      await expect(dialog.getByText(/^\.html, up to 50 MB and 10,000 links$/)).toBeVisible();
      await dialog.getByRole('button', { name: 'How to export bookmarks from a browser' }).click();
      await expect(dialog.getByText(/^Chrome and Edge:/)).toBeVisible();
      // The picker button opens the hidden file input; Playwright fills it directly.
      await dialog.locator('input[type="file"]').setInputFiles(CHROME_EXPORT);

      // Step 2: the file name is the title; nothing is written yet.
      const review = page.getByRole('dialog', { name: 'chrome-bookmarks.html' });
      await expect(review.getByText('already on your shelf', { exact: true })).toBeVisible();
      await expect(review.getByRole('checkbox', { name: /^Skip the 1 duplicate/ })).toBeChecked();
      // The file has folders: they are the default; AI is off, so it is not offered.
      await expect(review.getByRole('radio', { name: /^As in the file/ })).toBeChecked();
      await expect(review.getByRole('radio', { name: /^No folders/ })).not.toBeChecked();
      await expect(review.getByRole('radio', { name: /Let AI sort/ })).toHaveCount(0);
      if (isPhone(page)) {
        // The sheet's footer buttons span the width.
        const button = review.getByRole('button', { name: 'Import 7 links' });
        const box = await button.boundingBox();
        const sheet = await review.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThan((sheet?.width ?? 0) * 0.8);
      }
      await review.getByRole('button', { name: 'Import 7 links' }).click();

      // Step 3: the summary.
      await expect(page.getByText('7 links imported')).toBeVisible();
      await expect(page.getByText(/In “Imported bookmarks”\. 6 folders\./)).toBeVisible();

      // The new folder holds the file's folders.
      await page.getByRole('button', { name: 'Open the folder' }).click();
      await expect(page).toHaveURL(/\/folders\/[0-9a-f-]+$/);
      await expect(page.getByRole('heading', { name: 'Imported bookmarks' })).toBeVisible();

      // Recent imports sits in step 1 and offers Undo for 7 days; Undo asks first, then everything
      // goes to Trash. In-app navigation: a reload would start the mock library over.
      const again = await reopenImport(page);
      await expect(again.getByText('chrome-bookmarks.html')).toBeVisible();
      await again.getByRole('button', { name: 'Undo import: chrome-bookmarks.html' }).click();
      const confirm = page.getByRole('dialog', { name: 'Undo this import?' });
      await confirm.getByRole('button', { name: 'Undo import' }).click();
      await expect(page.getByText('Import undone')).toBeVisible();
      await expect(again.getByText('chrome-bookmarks.html')).toHaveCount(0);
      await again.getByRole('button', { name: 'Close' }).click();

      // One Trash entry: the import's folder with everything inside.
      await openTrash(page);
      await expect(trashRow(page, 'Imported bookmarks')).toHaveCount(1);
    },
  );

  test(
    'groups the links by topic with AI, renames one group, leaves one out and imports',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedAi(page);
      const dialog = await openImport(page);
      await dialog.locator('input[type="file"]').setInputFiles(CHROME_EXPORT);

      const review = page.getByRole('dialog', { name: 'chrome-bookmarks.html' });
      // The three choices, with the cost of the AI one named.
      await expect(review.getByRole('radio', { name: /^As in the file/ })).toBeChecked();
      await expect(review.getByText(/Uses 7 of [\d,]+ runs for existing links\./)).toBeVisible();
      // The native radio is visually hidden; its label is the click target.
      await review.getByText('Let AI sort them by topic').click();
      await expect(review.getByRole('radio', { name: /Let AI sort/ })).toBeChecked();
      await review.getByRole('button', { name: 'Group' }).click();

      // Step 2a: the groups, nothing written yet.
      await expect(review.getByText('3 groups for 7 links')).toBeVisible();
      await expect(review.getByText('already there')).toBeVisible();
      await expect(review.getByText('Angular · DOMParser - Web APIs | MDN')).toBeVisible();
      await expect(
        review.getByText('Links that fit no topic go to “Imported bookmarks”.'),
      ).toBeVisible();
      // Only a new group has an editable name; "Other" has no tick.
      await expect(review.getByRole('textbox', { name: 'Folder name' })).toHaveCount(2);
      await expect(review.getByRole('checkbox')).toHaveCount(3);

      await review.getByRole('textbox', { name: 'Folder name' }).first().fill('Cooking');
      await review.getByRole('checkbox', { name: 'Development' }).uncheck({ force: true });
      await review.getByRole('button', { name: 'Import and create 1 folder' }).click();

      await expect(page.getByText('7 links imported')).toBeVisible();
      await expect(page.getByText('In 2 folders, 1 of them new.')).toBeVisible();

      // Cooking was created below the target; the unticked group created nothing.
      await page.getByRole('button', { name: 'Open the folder' }).click();
      await expect(page.getByRole('heading', { name: 'Imported bookmarks' })).toBeVisible();
      await expect(page.getByText('Cooking').first()).toBeVisible();
      await expect(page.getByText('Development')).toHaveCount(0);
    },
  );

  test('takes a file dropped anywhere on the dialog and says so while it is dragged over', async ({
    page,
  }) => {
    const dialog = await openImport(page);
    const transfer = await page.evaluateHandle(() => {
      const data = new DataTransfer();
      data.items.add(new File(['x'], 'bookmarks.html', { type: 'text/html' }));
      return data;
    });

    await dialog
      .getByText('Browser bookmarks')
      .dispatchEvent('dragenter', { dataTransfer: transfer });
    await expect(dialog.getByText('Release to import')).toBeVisible();
    await dialog
      .getByText('Browser bookmarks')
      .dispatchEvent('dragleave', { dataTransfer: transfer });
    await expect(dialog.getByText('Drag the file here')).toBeVisible();
  });

  test('refuses a file that is not a bookmarks export', async ({ page }) => {
    const dialog = await openImport(page);
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('just some notes'),
    });
    await expect(dialog.getByRole('alert')).toContainText(
      'There are no bookmarks in this file. Choose the HTML file your browser saved',
    );
  });
});

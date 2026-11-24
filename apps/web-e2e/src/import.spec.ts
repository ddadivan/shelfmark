import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedAi } from './support/ai';
import { openDataDialog } from './support/data-menu';
import { seedSession } from './support/mock-session';
import { openTrash, trashRow } from './support/trash';
import { E2E_TAG } from './models/e2e-tag.const';

// A real Chrome export (the parser's fixture in apps/web): 8 web links in nested folders, one
// repeated address, a bookmarklet and a chrome:// entry. Resolved from this file, not the working
// directory: CI runs the e2e project from apps/web-e2e, locally Nx runs it from the workspace root.
const CHROME_EXPORT = join(
  __dirname,
  '../../web/src/app/features/import/utils/fixtures/chrome-bookmarks.html',
);

/**
 * Opens "Import links" from the library: the sidebar's Data & help menu, or Your data in the
 * mobile shell. Shelf block 5b: the /import page with the numbered steps (the dialog is gone).
 */
async function openImport(page: Page) {
  await page.goto('/links');
  return reopenImport(page);
}

/** Opens the page again without a page load (a reload would start the mock library over). */
async function reopenImport(page: Page) {
  await openDataDialog(page, 'Import links');
  await expect(page).toHaveURL('/import');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1, name: 'Import bookmarks' })).toBeVisible();
  return main;
}

/** The "How to get the file from" help of step 1: one browser at a time. */
function exportHelp(page: Page) {
  return page.getByRole('region', { name: 'How to get the file from' });
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

      // Step 1: an empty-state stack (scene, the browser source, the real limits, the button,
      // "or drag the file here") and the short help.
      await expect(dialog.getByRole('heading', { name: 'Browser bookmarks' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Choose file' })).toBeVisible();
      await expect(dialog.getByText('or drag the file here')).toBeVisible();
      await expect(dialog.getByText(/^\.html, up to 50 MB and 10,000 links$/)).toBeVisible();
      // The help shows the detected browser (Chromium: Chrome) at once.
      await expect(exportHelp(page).getByText(/^Chrome: open the bookmark manager/)).toBeVisible();
      await expect(
        dialog.getByRole('list', { name: 'Import steps' }).getByRole('listitem'),
      ).toHaveText([/1\s*Choose file/, /2\s*Check/, /3\s*Folders/, /4\s*Import/]);
      // The picker button opens the hidden file input; Playwright fills it directly.
      await dialog.locator('input[type="file"]').setInputFiles(CHROME_EXPORT);

      // Step 2: the file name is the lead; nothing is written yet.
      const review = page.getByRole('main');
      await expect(review.getByText('chrome-bookmarks.html', { exact: true })).toBeVisible();
      await expect(review.getByText('already on your shelf', { exact: true })).toBeVisible();
      await expect(review.getByRole('checkbox', { name: /^Skip the 1 duplicate/ })).toBeChecked();
      // The file has folders: they are the default; AI is off, so it is not offered.
      await expect(review.getByRole('radio', { name: /^As in the file/ })).toBeChecked();
      await expect(review.getByRole('radio', { name: /^No folders/ })).not.toBeChecked();
      await expect(review.getByRole('radio', { name: /Let AI sort/ })).toHaveCount(0);
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

      const review = page.getByRole('main');
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

  test('takes a file dropped anywhere on the page and says so while it is dragged over', async ({
    page,
  }) => {
    const dialog = await openImport(page);
    // A string, like the other specs: the e2e tsconfig has no DOM types.
    const transfer = await page.evaluateHandle(`(() => {
      const data = new DataTransfer();
      data.items.add(new File(['x'], 'bookmarks.html', { type: 'text/html' }));
      return data;
    })()`);

    await dialog
      .getByText('Browser bookmarks')
      .dispatchEvent('dragenter', { dataTransfer: transfer });
    await expect(dialog.getByText('Release to import')).toBeVisible();
    await dialog
      .getByText('Browser bookmarks')
      .dispatchEvent('dragleave', { dataTransfer: transfer });
    await expect(dialog.getByText('or drag the file here')).toBeVisible();
  });

  test('gives the export help with the keys of the platform', async ({ page }) => {
    // Chromium on Linux: Windows-style keys, no Safari.
    await openImport(page);
    const help = exportHelp(page);
    await expect(help.getByRole('radio')).toHaveCount(3);
    await expect(help.getByRole('radio', { name: 'Chrome' })).toBeChecked();
    await expect(help.getByText(/^Chrome: open the bookmark manager/)).toContainText(
      'Ctrl+Shift+O',
    );
    await expect(help.getByRole('radio', { name: 'Safari' })).toHaveCount(0);

    // The same browser reporting a Mac: Command / Option glyph caps and the Safari step.
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' });
      Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined });
    });
    await openImport(page);
    await expect(help.getByRole('radio')).toHaveCount(4);
    const chrome = help.getByText(/^Chrome: open the bookmark manager/);
    await expect(chrome).toContainText('Command+Option+B');
    await expect(chrome.locator('kbd ui-icon')).toHaveCount(2);
    // A click event on the radio itself (the segmented control's label sits over it).
    await help.getByRole('radio', { name: 'Safari' }).dispatchEvent('click');
    await expect(help.getByRole('radio', { name: 'Safari' })).toBeChecked();
    await expect(help.getByText('Safari: File, Export, Bookmarks.')).toBeVisible();
  });

  test('refuses a file that is not a bookmarks export', async ({ page }) => {
    const dialog = await openImport(page);
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('just some notes'),
    });
    await expect(dialog.locator('ui-notice')).toContainText(
      'There are no bookmarks in this file. Choose the HTML file your browser saved',
    );
  });
});

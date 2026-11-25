import { readFile } from 'node:fs/promises';
import { type Download } from '@playwright/test';
import { expect, test } from './support/test';
import { openDataDialog } from './support/data-menu';
import { seedSession } from './support/mock-session';
import { exportAs, openExportView } from './support/library-toolbar';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_LINKS_SCENARIO } from './models/mock-links-scenario.const';

// Mirrors EXPORT_MOCK_MARKER (apps/web); this project cannot import it.
const MOCK_MARKER = 'sm-mock-export';

/** The second line of the mock file: the URL the real API would have been asked for. */
/** The mock writes a real CSV (no marker line): its header row, the BOM dropped. */
async function csvHeader(download: Download): Promise<string> {
  const text = await readFile(await download.path(), 'utf8');
  return text.replace(/^\uFEFF/u, '').split(/\r?\n/u)[0];
}

async function requestedUrl(download: Download): Promise<string> {
  const path = await download.path();
  const lines = (await readFile(path, 'utf8')).split('\n');
  expect(lines[0]).toBe(MOCK_MARKER);
  return lines[1];
}

test.describe('export (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('the library menu opens the dialog that exports everything as JSON, Bookmarks HTML and CSV', async ({
    page,
  }) => {
    await page.goto('/links');
    const dialog = await openExportView(page);
    // No folder or tag narrows "All links": no "What" choice, only the formats.
    await expect(dialog.getByText(/^This view/)).toHaveCount(0);

    const json = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export JSON' }).click();
    const jsonFile = await json;
    // Named like the API's Content-Disposition: shelfmark-<day>.<format>.
    expect(jsonFile.suggestedFilename()).toMatch(/^shelfmark-\d{4}-\d{2}-\d{2}\.json$/);
    expect(await requestedUrl(jsonFile)).toBe('/api/export?format=json');

    // The dialog closes with the saved file.
    await expect(dialog).toHaveCount(0);
    const again = await openExportView(page);
    const html = page.waitForEvent('download');
    await exportAs(again, 'Bookmarks HTML');
    const htmlFile = await html;
    expect(htmlFile.suggestedFilename()).toMatch(/^shelfmark-\d{4}-\d{2}-\d{2}\.html$/);
    expect(await requestedUrl(htmlFile)).toBe('/api/export?format=html');

    await expect(again).toHaveCount(0);
    const last = await openExportView(page);
    const csv = page.waitForEvent('download');
    await exportAs(last, 'CSV');
    const csvFile = await csv;
    expect(csvFile.suggestedFilename()).toMatch(/^shelfmark-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(await csvHeader(csvFile)).toBe('url,title,folder,tags,note,favorite,kind,created_at');
  });

  test('a tag filter adds "This view" to the dialog, chosen first, carrying the tag', async ({
    page,
  }) => {
    // A view with links (an empty one only explains, below). The encoding of tags such as `c++`
    // is covered by export-url.spec.ts.
    await page.goto('/links?tag=docs');
    await expect(page.locator('ui-card').first()).toBeVisible();
    const dialog = await openExportView(page);
    await expect(dialog.getByText(/^Whole library/)).toBeVisible();
    await expect(dialog.getByText(/^This view/)).toBeVisible();

    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export JSON' }).click();

    expect(await requestedUrl(await download)).toBe('/api/export?format=json&tag=docs');

    await expect(dialog).toHaveCount(0);
    const again = await openExportView(page);
    const csv = page.waitForEvent('download');
    await exportAs(again, 'CSV');
    const viewCsv = await csv;
    expect(viewCsv.suggestedFilename()).toMatch(/\.csv$/u);
    expect(await csvHeader(viewCsv)).toBe('url,title,folder,tags,note,favorite,kind,created_at');
  });

  test('an empty view explains instead of saving an empty file', async ({ page }) => {
    let downloads = 0;
    page.on('download', () => downloads++);

    // No mock link has both tags: the view is empty, the library is not.
    await page.goto('/links?tag=docs&tag=c%2B%2B');
    await expect(page.locator('ui-empty-state')).toBeVisible();
    const dialog = await openExportView(page);
    await dialog.getByRole('button', { name: 'Export JSON' }).click();

    await expect(page.getByText('Nothing to export in this view')).toBeVisible();
    expect(downloads).toBe(0);
  });

  test(
    'the data menu (the You tab on a phone) exports everything through the dialog',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await page.goto('/links');
      await openDataDialog(page, 'Export');
      const download = page.waitForEvent('download');
      await page
        .getByRole('dialog', { name: 'Export links' })
        .getByRole('button', { name: 'Export JSON' })
        .click();

      expect(await requestedUrl(await download)).toBe('/api/export?format=json');
    },
  );

  test('Settings › Your data exports through the dialog; the old export page leads there', async ({
    page,
  }) => {
    await page.goto('/settings/import-export');
    await expect(page).toHaveURL('/settings/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'Your data' })).toBeVisible();

    await page
      .getByRole('group', { name: 'Import and export' })
      .getByRole('button', { name: 'Export' })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Export links' });
    await dialog.getByText('Bookmarks HTML', { exact: true }).click();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: /^Export / }).click();

    expect(await requestedUrl(await download)).toBe('/api/export?format=html');
  });
});

test.describe('export with nothing to export (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    // A new account: no link at all.
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.empty],
    );
  });

  test(
    'every export explains there is nothing yet instead of saving an empty file',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      let downloads = 0;
      page.on('download', () => downloads++);
      const notice = page.getByText('Nothing to export yet');

      await page.goto('/links');
      // The first run of an empty library (Shelf block 6a).
      await expect(page.getByRole('heading', { name: 'Your shelf is empty' })).toBeVisible();
      const viewDialog = await openExportView(page);
      await viewDialog.getByRole('button', { name: 'Export JSON' }).click();
      await expect(notice).toBeVisible();
      await expect(
        page.getByText('Save a link first, then you can export your library'),
      ).toBeVisible();

      // The export dialog (data menu, or Your data in the mobile shell) explains the same and closes.
      await page.locator('ui-toast').getByRole('button', { name: 'Dismiss' }).first().click();
      await openDataDialog(page, 'Export');
      const dialog = page.getByRole('dialog', { name: 'Export links' });
      await dialog.getByText('Bookmarks HTML', { exact: true }).click();
      await dialog.getByRole('button', { name: /^Export / }).click();
      await expect(dialog).toHaveCount(0);
      await expect(notice.first()).toBeVisible();

      expect(downloads).toBe(0);
    },
  );
});

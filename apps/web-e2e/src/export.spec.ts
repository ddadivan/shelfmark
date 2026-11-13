import { readFile } from 'node:fs/promises';
import { type Download } from '@playwright/test';
import { expect, test } from './support/test';
import { openAccountMenu, openSettingsSection, seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { openExportMenu } from './support/library-toolbar';

// Mirrors EXPORT_MOCK_MARKER (apps/web); this project cannot import it.
const MOCK_MARKER = 'sm-mock-export';
// Mirrors MOCK_EXPORT_FAILS_TAG: the first mock export with this tag fails, the retry succeeds.
const FAILS_TAG = 'mock-fail';
// Mirrors MOCK_ID.FolderReading (libs/shared/contracts).
const READING_ID = '00000000-0000-4000-8000-000000000101';

/** The second line of the mock file: the URL the real API would have been asked for. */
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

  test('the library menu exports everything as JSON and as Bookmarks HTML', async ({ page }) => {
    await page.goto('/links');
    await openExportMenu(page);
    // No folder or tag narrows "All links": only the two "everything" items.
    await expect(page.getByRole('menuitem', { name: /^This view/ })).toHaveCount(0);

    const json = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Everything as JSON' }).click();
    const jsonFile = await json;
    // Named like the API's Content-Disposition: shelfmark-<day>.<format>.
    expect(jsonFile.suggestedFilename()).toMatch(/^shelfmark-\d{4}-\d{2}-\d{2}\.json$/);
    expect(await requestedUrl(jsonFile)).toBe('/api/export?format=json');

    // The first menu is still leaving: opening now would toggle it shut.
    await expect(page.getByRole('menu')).toBeHidden();
    await openExportMenu(page);
    await expect(page.getByRole('menuitem', { name: 'Everything as JSON' })).toBeVisible();
    const html = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Everything as Bookmarks HTML' }).click();
    const htmlFile = await html;
    expect(htmlFile.suggestedFilename()).toMatch(/^shelfmark-\d{4}-\d{2}-\d{2}\.html$/);
    expect(await requestedUrl(htmlFile)).toBe('/api/export?format=html');
  });

  test('a tag filter adds "This view" items that carry the tag', async ({ page }) => {
    await page.goto('/links?tag=docs&tag=c%2B%2B');
    await openExportMenu(page);

    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'This view as JSON' }).click();

    expect(await requestedUrl(await download)).toBe('/api/export?format=json&tag=docs&tag=c%2B%2B');
  });

  test('a folder view exports that folder', async ({ page }) => {
    await page.goto(`/folders/${READING_ID}`);
    await openExportMenu(page);

    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'This view as JSON' }).click();

    expect(await requestedUrl(await download)).toBe(
      `/api/export?format=json&folderId=${READING_ID}`,
    );
  });

  test('a failed export toasts and the retry downloads the file', async ({ page }) => {
    await page.goto(`/links?tag=${FAILS_TAG}`);
    await openExportMenu(page);
    await page.getByRole('menuitem', { name: 'This view as JSON' }).click();

    await expect(page.getByText("Couldn't export your links")).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Try again' }).click();

    expect(await requestedUrl(await download)).toBe(`/api/export?format=json&tag=${FAILS_TAG}`);
    await expect(page.getByText("Couldn't export your links")).toBeHidden();
  });

  test('the toolbar does not scroll the page sideways at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/links?tag=docs');
    await expect(
      page.getByRole('button', { name: isCompact(page) ? 'View' : 'Export', exact: true }),
    ).toBeVisible();

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the account menu (the You tab on a phone) exports everything', async ({ page }) => {
    await page.goto('/links');
    const download = page.waitForEvent('download');
    if (isCompact(page)) {
      await openSettingsSection(page, 'Export');
      await page.getByRole('button', { name: 'JSON' }).click();
    } else {
      await openAccountMenu(page);
      await page.getByRole('menuitem', { name: 'Everything as JSON' }).click();
    }

    expect(await requestedUrl(await download)).toBe('/api/export?format=json');
  });

  test('settings export both formats', async ({ page }) => {
    await page.goto('/settings/import-export');
    await expect(page.getByText('Export your data')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Bookmarks HTML' }).click();

    expect(await requestedUrl(await download)).toBe('/api/export?format=html');
  });
});

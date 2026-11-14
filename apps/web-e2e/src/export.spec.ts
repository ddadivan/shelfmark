import { readFile } from 'node:fs/promises';
import { type Download } from '@playwright/test';
import { expect, test } from './support/test';
import { openAccountMenu, openSettingsSection, seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { openExportMenu } from './support/library-toolbar';
import { E2E_TAG } from './models/e2e-tag.const';

// Mirrors EXPORT_MOCK_MARKER (apps/web); this project cannot import it.
const MOCK_MARKER = 'sm-mock-export';

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

  test(
    'the account menu (the You tab on a phone) exports everything',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await page.goto('/links');
      const download = page.waitForEvent('download');
      if (isCompact(page)) {
        await openSettingsSection(page, 'Account');
        await page.getByRole('button', { name: 'Download JSON' }).click();
      } else {
        await openAccountMenu(page);
        await page.getByRole('menuitem', { name: 'Everything as JSON' }).click();
      }

      expect(await requestedUrl(await download)).toBe('/api/export?format=json');
    },
  );

  test('Account › Your data exports both formats; the old export page leads there', async ({
    page,
  }) => {
    await page.goto('/settings/import-export');
    await expect(page).toHaveURL('/settings/account#your-data');
    const yourData = page.getByRole('heading', { name: 'Your data' });
    await expect(yourData).toBeInViewport();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Bookmarks HTML' }).click();

    expect(await requestedUrl(await download)).toBe('/api/export?format=html');
  });
});

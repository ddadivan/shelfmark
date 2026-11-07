import { readFile } from 'node:fs/promises';
import { expect, test, type Download, type Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { openAccountMenu, seedSession } from './support/mock-session';

// Mirrors EXPORT_MOCK_MARKER (apps/web); this project cannot import it.
const MOCK_MARKER = 'sm-mock-export';

/** The second line of the mock file: the URL the real API would have been asked for. */
async function requestedUrl(download: Download): Promise<string> {
  const path = await download.path();
  const lines = (await readFile(path, 'utf8')).split('\n');
  expect(lines[0]).toBe(MOCK_MARKER);
  return lines[1];
}

for (const colorScheme of Object.values(COLOR_SCHEME)) {
  test.describe(`export (mock API, ${colorScheme} theme)`, () => {
    test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
    test.use({ colorScheme });

    test.beforeEach(async ({ page }) => {
      await seedSession(page);
    });

    async function settled(page: Page) {
      await page.evaluate(
        'Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))',
      );
    }

    test('the library menu exports everything as JSON and as Bookmarks HTML', async ({
      page,
    }, testInfo) => {
      await page.goto('/links');
      await page.getByRole('button', { name: 'Export' }).click();
      await settled(page);
      await expectNoBlockingViolations(page, testInfo, {
        disabledRules: ['label-content-name-mismatch'],
      });
      // No folder or tag narrows "All links": only the two "everything" items.
      await expect(page.getByRole('menuitem', { name: /^This view/ })).toHaveCount(0);

      const json = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: 'Everything as JSON' }).click();
      const jsonFile = await json;
      expect(jsonFile.suggestedFilename()).toBe('shelfmark-export.json');
      expect(await requestedUrl(jsonFile)).toBe('/api/export?format=json');

      await page.getByRole('button', { name: 'Export' }).click();
      const html = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: 'Everything as Bookmarks HTML' }).click();
      const htmlFile = await html;
      expect(htmlFile.suggestedFilename()).toBe('shelfmark-bookmarks.html');
      expect(await requestedUrl(htmlFile)).toBe('/api/export?format=html');
    });

    test('a tag filter adds "This view" items that carry the tag', async ({ page }) => {
      await page.goto('/links?tag=docs&tag=c%2B%2B');
      await page.getByRole('button', { name: 'Export' }).click();

      const download = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: 'This view as JSON' }).click();

      expect(await requestedUrl(await download)).toBe(
        '/api/export?format=json&tag=docs&tag=c%2B%2B',
      );
    });

    test('the account menu exports everything', async ({ page }) => {
      await page.goto('/links');
      await openAccountMenu(page);

      const download = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: 'Everything as JSON' }).click();

      expect(await requestedUrl(await download)).toBe('/api/export?format=json');
    });

    test('settings export both formats', async ({ page }, testInfo) => {
      await page.goto('/settings');
      await expect(page.getByText('Export your data')).toBeVisible();
      await settled(page);
      await expectNoBlockingViolations(page, testInfo, {
        disabledRules: ['label-content-name-mismatch'],
      });

      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Bookmarks HTML' }).click();

      expect(await requestedUrl(await download)).toBe('/api/export?format=html');
    });
  });
}

import { type Page } from '@playwright/test';
import { MOCK_FIXTURE } from '../src/models/mock-fixture.const';
import { openFeed, pickFolderMenuItem } from '../src/support/a11y-flows';
import { switchView } from '../src/support/library-toolbar';
import { SEARCH_FIELD_NAME } from '../src/support/search-button';
import { isCompact, openSidebar, tabBar } from '../src/support/sidebar';
import { expect, expectScreen, test } from './support/visual-test';
import { openAddLinkDialog } from './support/visual-flows';

const READING = MOCK_FIXTURE.readingName;

test.describe('visual: library (mock API)', () => {
  test.beforeEach(async ({ page }) => {
    await openFeed(page);
  });

  test('library as cards', async ({ page }) => {
    await switchView(page, 'Cards');
    await expect(page.locator('ui-card').first()).toBeVisible();

    await expectScreen(page, 'library-cards');
  });

  test('library as list', async ({ page }) => {
    await switchView(page, 'List');
    await expect(page.locator('ui-list-item').first()).toBeVisible();

    await expectScreen(page, 'library-list');
  });

  test('a folder feed', async ({ page }) => {
    await openSidebar(page);
    await page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) }).click();
    await expect(page.getByRole('heading', { level: 1, name: READING })).toBeVisible();
    await expect(page.locator('ui-card').first()).toBeVisible();

    await expectScreen(page, 'folder-feed');
  });

  test('the sidebar with folders and tags (the Library tab on compact screens)', async ({
    page,
  }) => {
    await openSidebar(page);
    await expect(page.getByRole('treeitem', { name: /^Reading\b/ })).toBeVisible();
    if (!isCompact(page)) {
      await expect(page.locator('app-sidebar-tags')).toBeVisible();
    }

    await expectScreen(page, 'sidebar');
  });

  test('search results panel under the header field', async ({ page }) => {
    test.skip(isCompact(page), 'the header search field exists from 80em (desktop project only)');
    await page.getByRole('combobox', { name: SEARCH_FIELD_NAME }).fill(MOCK_FIXTURE.searchWord);
    const results = page.getByRole('listbox', { name: 'Search results' });
    await expect(page.getByRole('option').first()).toBeVisible();
    await expect(results).not.toHaveAttribute('aria-busy', 'true');

    await expectScreen(page, 'search-results');
  });

  test('add link dialog (a bottom sheet on a phone)', async ({ page }) => {
    await openAddLinkDialog(page);

    await expectScreen(page, 'add-link');
  });

  test('folder colour and icon dialog', async ({ page }) => {
    await pickFolderMenuItem(page, READING, 'Color and icon…');
    await expect(page.getByRole('dialog', { name: READING })).toBeVisible();

    await expectScreen(page, 'folder-style');
  });

  test('empty filter result', async ({ page }) => {
    await page.goto('/links?tag=docs&tag=recipes');
    await expect(page.getByRole('heading', { name: 'No links with these tags' })).toBeVisible();

    await expectScreen(page, 'empty-filter');
  });

  test('tab bar on the Library tab', async ({ page }) => {
    test.skip(!isCompact(page), 'the tab bar replaces the sidebar below 64em');
    await openSidebar(page);
    await expect(tabBar(page)).toBeVisible();

    await expectScreen(page, 'tab-bar');
  });

  test('a bottom sheet over the tab bar (Recently opened)', async ({ page }) => {
    test.skip(!isCompact(page), 'the tab bar and its sheets exist below 64em');
    await openSidebar(page);
    await openRecentlyOpened(page);

    await expectScreen(page, 'bottom-sheet');
  });
});

async function openRecentlyOpened(page: Page): Promise<void> {
  await page
    .locator('app-library-tile')
    .getByRole('link', { name: /^Recently opened\b/ })
    .click();
  await expect(page.getByRole('dialog', { name: 'Recently opened' })).toBeVisible();
  await expect(page.locator('app-link-history-row').first()).toBeVisible();
}

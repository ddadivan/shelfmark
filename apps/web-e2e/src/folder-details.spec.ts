import { type Locator, type Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { MOCK_LINKS_SCENARIO } from './models/mock-links-scenario.const';
import { openFeed, pickFolderMenuItem } from './support/a11y-flows';
import { openSidebar } from './support/sidebar';
import { expect, test } from './support/test';

const READING = MOCK_FIXTURE.readingName;
const DESCRIPTION = 'Long reads worth a second look';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
  'base64',
);

// The folder description and cover (#418). The mock state lives in the page: every step after
// the first load navigates inside the app.
test.describe('folder description and cover (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  /** Starts with every link previewed; `broken` answers the pictures with 404 (before any load). */
  async function start(page: Page, broken = false): Promise<void> {
    await page.route(/\/api\/links\/[^/]+\/image\?v=/, (route) =>
      broken
        ? route.fulfill({ status: 404 })
        : route.fulfill({ contentType: 'image/png', body: PNG }),
    );
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.previews],
    );
    await openFeed(page);
  }

  const folderRow = (page: Page): Locator =>
    page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) });

  async function openReading(page: Page): Promise<void> {
    await openSidebar(page);
    await folderRow(page).click();
    await expect(page).toHaveURL(`/folders/${MOCK_FIXTURE.readingId}`);
  }

  test(
    'a description and a cover of a highlighted folder show in the plain folder header',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await start(page);
      await pickFolderMenuItem(page, READING, 'Folder settings…');
      const dialog = page.getByRole('dialog', { name: 'Folder settings' });
      await dialog.getByLabel('Description').fill(`  ${DESCRIPTION}  `);
      await dialog
        .locator('label.ui-choice', { has: page.getByLabel('Clay', { exact: true }) })
        .click();
      const covers = dialog.getByRole('radiogroup', { name: 'Cover' });
      await expect(covers.getByRole('radio', { name: 'No cover' })).toBeChecked();
      const first = covers.locator('label.ui-choice').nth(1);
      await first.scrollIntoViewIfNeeded();
      await first.click();
      await dialog.getByRole('switch', { name: 'Highlight with background' }).click();
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(dialog).toHaveCount(0);

      // The sidebar row is described by the description (the tooltip's text).
      await openSidebar(page);
      await expect(folderRow(page)).toHaveAttribute('aria-description', DESCRIPTION);

      // Shelf 04-organise: every folder page has the same header (the cover or the 40px tile, the
      // title, the counts, the description); the highlight colours only the sidebar row.
      await openReading(page);
      await expect(page.locator('ui-folder-banner')).toHaveCount(0);
      const head = page.locator('.library__heading--folder');
      await expect(head.getByRole('heading', { level: 1, name: READING })).toBeVisible();
      await expect(head.getByText(DESCRIPTION, { exact: true })).toBeVisible();
      const cover = head.locator('app-folder-cover img');
      await expect(cover).toBeVisible();
      await expect(cover).toHaveAttribute('src', /\/api\/links\/[^/]+\/image\?v=/);
    },
  );

  test('a cover that fails to load leaves no broken picture in the header', async ({ page }) => {
    await start(page, true);
    await pickFolderMenuItem(page, READING, 'Folder settings…');
    const dialog = page.getByRole('dialog', { name: 'Folder settings' });
    await dialog
      .locator('label.ui-choice', { has: page.getByLabel('Teal', { exact: true }) })
      .click();
    await dialog
      .getByRole('radiogroup', { name: 'Cover' })
      .locator('label.ui-choice')
      .nth(1)
      .click();
    await dialog.getByRole('switch', { name: 'Highlight with background' }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);

    await openReading(page);
    const head = page.locator('.library__heading--folder');
    await expect(head.getByRole('heading', { level: 1, name: READING })).toBeVisible();
    // The picture answered 404: the cover draws nothing rather than a broken image.
    await expect(head.locator('app-folder-cover')).toHaveClass(/folder-cover--failed/);
    await expect(head.locator('app-folder-cover img')).toHaveCount(0);
  });

  test(
    'a folder that is not highlighted keeps its description and cover in the plain title block',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await start(page);
      await pickFolderMenuItem(page, READING, 'Folder settings…');
      const dialog = page.getByRole('dialog', { name: 'Folder settings' });
      await dialog.getByLabel('Description').fill(DESCRIPTION);
      await dialog
        .getByRole('radiogroup', { name: 'Cover' })
        .locator('label.ui-choice')
        .nth(1)
        .click();
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(dialog).toHaveCount(0);

      await openReading(page);
      await expect(page.locator('ui-folder-banner')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: READING })).toBeVisible();
      await expect(page.getByText(DESCRIPTION, { exact: true })).toBeVisible();
      await expect(page.locator('app-folder-cover img')).toHaveAttribute(
        'src',
        /\/api\/links\/[^/]+\/image\?v=/,
      );
    },
  );
});

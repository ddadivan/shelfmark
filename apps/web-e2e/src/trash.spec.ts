import { type Locator, type Page } from '@playwright/test';
import { openFeed } from './support/a11y-flows';
import { openSidebar, viewEntry } from './support/sidebar';
import { expect, test } from './support/test';
import {
  deleteFirstLink,
  deleteReadingFolderWithLinks,
  deleteRowForever,
  openTrash,
  restoreRow,
  selectRow,
  trashRow,
} from './support/trash';
import { E2E_TAG } from './models/e2e-tag.const';

// The mock state lives in the page: every step navigates inside the app, never with `page.goto`
// (which would start a fresh mock library).
test.describe('trash (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  const emptyTrash = (page: Page) => page.getByRole('heading', { name: 'Trash is empty' });

  test('the empty Trash is the page card, centred in the content area (#315)', async ({ page }) => {
    await openFeed(page);
    await openTrash(page);
    await expect(emptyTrash(page)).toBeVisible();

    const state = page.locator('ui-empty-state');
    await expect(state).toHaveClass(/ui-empty-state--page/);
    await expect(state.locator('ui-illustration')).toBeVisible();
    const box = async (locator: Locator) => {
      const found = await locator.boundingBox();
      expect(found).not.toBeNull();
      return found ?? { x: 0, y: 0, width: 0, height: 0 };
    };
    const main = await box(page.locator('main'));
    const card = await box(state);
    const heading = await box(emptyTrash(page));
    // The card runs to the bottom of the column (above the tab bar on a phone), its content sits
    // in the middle of it both ways.
    expect(card.height).toBeGreaterThan(main.height * 0.4);
    expect(Math.abs(heading.x + heading.width / 2 - (card.x + card.width / 2))).toBeLessThan(2);
    expect(heading.y).toBeGreaterThan(card.y + card.height * 0.35);
    expect(heading.y).toBeLessThan(card.y + card.height * 0.75);
  });

  test(
    'a deleted link appears in Trash and Restore puts it back in the feed',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openFeed(page);
      const title = await deleteFirstLink(page);
      await expect(page.getByText('Moved to Trash')).toBeVisible();

      await openTrash(page);
      await expect(trashRow(page, title)).toBeVisible();
      // Opening Trash sent the delete, so its Undo toast closes at once (Undo could not bring it back).
      await expect(page.getByText('Moved to Trash')).toBeHidden({ timeout: 2000 });
      await expect(trashRow(page, title)).toContainText('30 days left');
      await expect(trashRow(page, title)).toContainText('Deleted');
      await expect(page.locator('.trash-page__count')).toHaveText('1 item, kept for 30 days');

      await restoreRow(page, title);

      await expect(page.getByText('Restored', { exact: true })).toBeVisible();
      await expect(emptyTrash(page)).toBeVisible();
      await openSidebar(page);
      await viewEntry(page, 'All links').click();
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    },
  );

  test('a deleted folder is one entry with its link count and can be deleted for good', async ({
    page,
  }) => {
    await openFeed(page);
    const links = await deleteReadingFolderWithLinks(page);

    await openTrash(page);
    const row = trashRow(page, 'Reading');
    await expect(page.locator('app-trash-row')).toHaveCount(1);
    await expect(row).toContainText(`${links} links`);
    await expect(row.locator('ui-folder-icon')).toBeVisible();

    await deleteRowForever(page, 'Reading');

    await expect(page.getByText('Deleted for good', { exact: true })).toBeVisible();
    await expect(emptyTrash(page)).toBeVisible();
  });

  test(
    'selecting entries shows the bar and restores them together',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openFeed(page);
      const first = await deleteFirstLink(page);
      const second = await deleteFirstLink(page);
      await openTrash(page);

      await selectRow(page, first, true);
      await selectRow(page, second, false);
      const bar = page.getByRole('toolbar');
      await expect(bar).toContainText('2 selected');
      await bar.getByRole('button', { name: 'Restore' }).click();

      await expect(emptyTrash(page)).toBeVisible();
      await expect(page.getByRole('toolbar')).toHaveCount(0);
      await openSidebar(page);
      await viewEntry(page, 'All links').click();
      await expect(page.getByRole('heading', { name: first, exact: true })).toBeVisible();
    },
  );
});

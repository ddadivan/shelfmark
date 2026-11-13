import { type Locator, type Page } from '@playwright/test';
import { MOCK_TRASH_SCENARIO } from './models/mock-trash-scenario.const';
import { openFeed } from './support/a11y-flows';
import { openSettingsSection } from './support/mock-session';
import { openSidebar, viewEntry } from './support/sidebar';
import { settled } from './support/settled';
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

  // The native radio is visually hidden and covered by its label: check it directly.
  const pickRadio = async (page: Page, name: string) => {
    const radio = page.getByRole('radio', { name, exact: true });
    await expect(radio).toBeEnabled();
    // A forced click does not wait for the page's enter animation: let it end first.
    await settled(page);
    await radio.check({ force: true });
  };
  const pickRetention = async (page: Page, name: string) => {
    const radio = page.getByRole('radio', { name, exact: true });
    // The control is disabled until the settings have loaded.
    await expect(radio).toBeEnabled();
    await expect(page.locator('ui-segmented-control.ui-seg--disabled')).toHaveCount(0);
    // A forced click does not wait for the page's enter animation: let it end first.
    await settled(page);
    await radio.check({ force: true });
  };
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

  test('Empty trash asks first, naming the folder and its links, then deletes everything', async ({
    page,
  }) => {
    await openFeed(page);
    await deleteFirstLink(page);
    await openTrash(page);
    await deleteReadingFolderWithLinks(page);
    await openTrash(page);
    await expect(page.locator('app-trash-row')).toHaveCount(2);
    // The folder counts shown in the Trash row and in the dialog are the same number.
    const links = /(\d+) links/.exec(await trashRow(page, 'Reading').innerText())?.[1];
    const empty = page.getByRole('button', { name: /^Empty( trash)?$/ });

    await empty.click();
    const dialog = page.getByRole('alertdialog', { name: 'Empty trash?' });
    await expect(dialog).toContainText(
      `2 items will be deleted for good, including the folder “Reading” and its ${links} links.`,
    );
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('app-trash-row')).toHaveCount(2);

    await empty.click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete 2 items' }).click();

    await expect(emptyTrash(page)).toBeVisible();
    await expect(page.getByText('Trash emptied')).toBeVisible();
  });

  test('the chips filter All, Links and Folders with their counts', async ({ page }) => {
    await openFeed(page);
    const title = await deleteFirstLink(page);
    await openTrash(page);
    await deleteReadingFolderWithLinks(page);
    await openTrash(page);
    await expect(page.locator('app-trash-row')).toHaveCount(2);
    const group = page.getByRole('radiogroup', { name: 'Show' });

    await expect(group.getByText('All 2')).toBeVisible();
    await expect(group.getByText('Links 1')).toBeVisible();
    await expect(group.getByText('Folders 1')).toBeVisible();

    await pickRadio(page, 'Folders 1');
    await expect(page.locator('app-trash-row')).toHaveCount(1);
    await expect(trashRow(page, 'Reading')).toBeVisible();

    await pickRadio(page, 'Links 1');
    await expect(page.locator('app-trash-row')).toHaveCount(1);
    await expect(trashRow(page, title)).toBeVisible();

    await pickRadio(page, 'All 2');
    await expect(page.locator('app-trash-row')).toHaveCount(2);
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

  test('the retention setting changes the days left', async ({ page }) => {
    await openFeed(page);
    const title = await deleteFirstLink(page);
    await openSettingsSection(page, 'Library');
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();

    // The native radio is visually hidden; its label is the click target.
    await pickRetention(page, '7 days');
    await expect(page.getByRole('radio', { name: '7 days' })).toBeChecked();
    await page
      .getByRole('link', { name: 'Open Trash' })
      .or(page.getByRole('button', { name: 'Open Trash' }))
      .click();

    await expect(page).toHaveURL('/trash');
    await expect(trashRow(page, title)).toContainText('7 days left');
    await expect(page.locator('.trash-page__count')).toHaveText('1 item, kept for 7 days');
  });

  test.describe('shortening the retention with old items in Trash', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        ([key, value]) => sessionStorage.setItem(key, value),
        [MOCK_TRASH_SCENARIO.key, MOCK_TRASH_SCENARIO.oldItems],
      );
      await openFeed(page);
      await openSettingsSection(page, 'Library');
      await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
    });

    test('asks first, keeps the old value on Cancel and saves on confirm', async ({ page }) => {
      await pickRetention(page, '7 days');
      const dialog = page.getByRole('alertdialog');
      await expect(dialog).toContainText(
        '2 items in Trash are older than 7 days and will be deleted for good tonight.',
      );
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('radio', { name: '30 days' })).toBeChecked();

      await pickRetention(page, '7 days');
      await page.getByRole('alertdialog').getByRole('button', { name: 'Keep for 7 days' }).click();
      await expect(page.getByRole('radio', { name: '7 days' })).toBeChecked();
    });

    test('a longer value saves at once', async ({ page }) => {
      await pickRetention(page, '90 days');

      await expect(page.getByRole('radio', { name: '90 days' })).toBeChecked();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
    });
  });
});

import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { switchView } from './support/library-toolbar';

// Mirror MOCK_LINKS ("Simple pasta" is unsorted) and MOCK_NAME.FolderReading (libs/shared/contracts);
// the e2e project cannot import from them.
const PASTA = 'Simple pasta';
const READING = 'Reading';

async function openMoveDialog(page: Page, item: 'ui-card' | 'ui-list-item') {
  await page
    .locator(item)
    .filter({ hasText: PASTA })
    .getByRole('button', { name: /^Actions for / })
    .click();
  await page.getByRole('menuitem', { name: 'Move to folder…' }).click();
  const dialog = page.getByRole('dialog', { name: `Move “${PASTA}”` });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function pickFolder(page: Page, dialog: ReturnType<Page['getByRole']>, name: string) {
  await dialog.getByRole('combobox', { name: 'Folder' }).click();
  await page.getByRole('option').filter({ hasText: name }).click();
  await dialog.getByRole('button', { name: 'Move' }).click();
}

test.describe('move a link to a folder (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/unsorted');
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
  });

  test('moves a card out of Unsorted, confirms with a toast, and Undo brings it back', async ({
    page,
  }) => {
    const dialog = await openMoveDialog(page, 'ui-card');
    await pickFolder(page, dialog, READING);

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);
    const toast = page.getByRole('status').filter({ hasText: `Moved to ${READING}` });
    await expect(toast).toContainText(PASTA);

    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
  });

  test('works from a row in the list view', async ({ page }) => {
    await switchView(page, 'List');
    const dialog = await openMoveDialog(page, 'ui-list-item');
    await pickFolder(page, dialog, READING);

    await expect(page.getByText(PASTA, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: `Moved to ${READING}` })).toBeVisible();
  });

  test('Cancel keeps the link where it was', async ({ page }) => {
    const dialog = await openMoveDialog(page, 'ui-card');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
  });
});

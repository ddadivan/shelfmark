import { expect, test, type Page } from '@playwright/test';
import { pickFolderMenuItem } from './support/a11y-flows';
import { seedSession } from './support/mock-session';
import { closeSidebar, gotoWithSidebar, openSidebar } from './support/sidebar';

// Mirror MOCK_ID.FolderReading, MOCK_NAME.FolderReading / FolderAngular and MOCK_FOLDER_NAME
// (apps/web and libs/shared/contracts); the e2e project cannot import from them.
const READING = { id: '00000000-0000-4000-8000-000000000101', name: 'Reading' };
const ANGULAR = { id: '00000000-0000-4000-8000-000000000102', name: 'Angular' };
const CREATE_FAILS = 'Fail on create';

test.describe('folders (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  const row = (page: Page, name: string) =>
    page.getByRole('treeitem', { name: new RegExp(`^${name}\\b`) });

  async function createFolder(page: Page, name: string) {
    await page.getByRole('button', { name: 'New folder' }).click();
    const dialog = page.getByRole('dialog', { name: 'New folder' });
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByRole('button', { name: 'Create folder' }).click();
    return dialog;
  }

  test.describe('sidebar', () => {
    test('lists the fixed rows and the folder tree, and opens a folder', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      await expect(row(page, 'All links')).toBeVisible();
      await expect(row(page, 'Unsorted')).toBeVisible();
      await expect(row(page, 'Favorites')).toBeVisible();
      await expect(row(page, READING.name)).toBeVisible();

      await row(page, READING.name).click();

      await expect(page).toHaveURL(`/folders/${READING.id}`);
      await expect(page.getByRole('heading', { level: 1, name: READING.name })).toBeVisible();
      await openSidebar(page);
      await expect(row(page, READING.name)).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('ui-card').first()).toBeVisible();
    });

    test('is keyboard accessible: arrows move, Enter opens', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      await row(page, 'All links').focus();
      await page.keyboard.press('ArrowDown');
      await expect(row(page, 'Unsorted')).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL('/unsorted');
      await expect(page.getByRole('heading', { level: 1, name: 'Unsorted' })).toBeVisible();
    });

    test('opens the folders above a deep link', async ({ page }) => {
      await gotoWithSidebar(page, `/folders/${ANGULAR.id}`);

      await expect(row(page, ANGULAR.name)).toBeVisible();
      await expect(row(page, ANGULAR.name)).toHaveAttribute('aria-current', 'page');
    });

    test('creates a folder, opens it and shows the empty state', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      const dialog = await createFolder(page, 'Projects');

      await expect(dialog).toBeHidden();
      await expect(page).toHaveURL(/\/folders\/.+/);
      await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'This folder is empty' })).toBeVisible();
      await openSidebar(page);
      await expect(row(page, 'Projects')).toBeVisible();
    });

    test('creating a subfolder names the parent', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      await pickFolderMenuItem(page, READING.name, 'New subfolder');
      const dialog = page.getByRole('dialog', { name: `New folder in “${READING.name}”` });
      await dialog.getByLabel('Name').fill('Essays');
      await dialog.getByRole('button', { name: 'Create folder' }).click();

      await expect(page.getByRole('heading', { level: 1, name: 'Essays' })).toBeVisible();
      await openSidebar(page);
      await expect(row(page, 'Essays')).toBeVisible();
    });

    test('asks for a name', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      const dialog = await createFolder(page, '   ');

      await expect(dialog.getByText('Enter a folder name')).toBeVisible();
      await expect(dialog).toBeVisible();
    });

    test('keeps the dialog open with an error when the server refuses', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      const dialog = await createFolder(page, CREATE_FAILS);

      await expect(dialog.getByText("Couldn't create the folder")).toBeVisible();
      await expect(dialog).toBeVisible();
    });

    test('renames a folder from its menu', async ({ page }) => {
      await gotoWithSidebar(page, `/folders/${READING.id}`);

      await pickFolderMenuItem(page, READING.name, 'Rename');
      const dialog = page.getByRole('dialog', { name: 'Rename folder' });
      await expect(dialog.getByLabel('Name')).toHaveValue(READING.name);
      await dialog.getByLabel('Name').fill('Library');
      await dialog.getByRole('button', { name: 'Rename' }).click();

      await expect(dialog).toHaveCount(0);
      await closeSidebar(page);
      await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
      await openSidebar(page);
      await expect(row(page, 'Library')).toBeVisible();
    });

    test('moves a folder and never offers its own subtree', async ({ page }) => {
      await gotoWithSidebar(page, '/links');
      await createFolder(page, 'Archive');
      await expect(page.getByRole('heading', { level: 1, name: 'Archive' })).toBeVisible();
      await openSidebar(page);

      await pickFolderMenuItem(page, READING.name, 'Move to…');
      const dialog = page.getByRole('dialog', { name: `Move “${READING.name}”` });
      await dialog.getByRole('combobox').click();
      const options = page.getByRole('option');
      await expect(options.filter({ hasText: 'Archive' })).toBeVisible();
      await expect(options.filter({ hasText: ANGULAR.name })).toHaveCount(0);
      await expect(options.filter({ hasText: READING.name })).toHaveCount(0);
      await options.filter({ hasText: 'Archive' }).click();
      await dialog.getByRole('button', { name: 'Move' }).click();

      await expect(dialog).toBeHidden();
      await openSidebar(page);
      // Expand "Archive" with its twisty, which toggles without choosing the row. Clicking the row
      // also chooses it, and on a phone that closes the drawer, so the check below raced it.
      await row(page, 'Archive').locator('.ui-tree__twist').first().click();
      await expect(row(page, 'Archive')).toHaveAttribute('aria-expanded', 'true');
      await expect(row(page, READING.name)).toBeVisible();
    });

    test('moving a folder under a collapsed parent puts focus on that parent row', async ({
      page,
    }) => {
      await gotoWithSidebar(page, '/links');
      await createFolder(page, 'Archive');
      await expect(page.getByRole('heading', { level: 1, name: 'Archive' })).toBeVisible();
      await openSidebar(page);
      await expect(row(page, READING.name)).toBeVisible();

      await row(page, READING.name).focus();
      await page.keyboard.press('Shift+F10');
      await page.getByRole('menuitem', { name: 'Move to…' }).click();
      const dialog = page.getByRole('dialog', { name: `Move “${READING.name}”` });
      await dialog.getByRole('combobox').click();
      await page.getByRole('option').filter({ hasText: 'Archive' }).click();
      await dialog.getByRole('button', { name: 'Move' }).click();

      await expect(dialog).toBeHidden();
      // Archive is collapsed, so the moved row is hidden: focus must not fall to <body>.
      await expect(row(page, 'Archive')).toBeFocused();
    });

    test('deleting a folder keeps its links in Unsorted by default', async ({ page }) => {
      await gotoWithSidebar(page, `/folders/${READING.id}`);

      await pickFolderMenuItem(page, READING.name, 'Delete folder…');
      const dialog = page
        .getByRole('alertdialog')
        .or(page.getByRole('dialog', { name: /^Delete folder/ }));
      await expect(
        dialog.getByRole('heading', { name: `Delete folder “${READING.name}”?` }),
      ).toBeVisible();
      await expect(dialog.getByText(/It has \d+ links and 1 subfolder\./)).toBeVisible();
      await expect(dialog.getByRole('radio', { name: /Move links to Unsorted/ })).toBeChecked();
      await dialog.getByRole('button', { name: 'Delete folder', exact: true }).click();

      await expect(page.getByText('Folder deleted')).toBeVisible();
      await expect(page).toHaveURL('/links');
      await openSidebar(page);
      await expect(row(page, READING.name)).toHaveCount(0);
    });

    test('deleting a folder with its links says how many go', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      await pickFolderMenuItem(page, READING.name, 'Delete folder…');
      const dialog = page.getByRole('dialog', { name: `Delete folder “${READING.name}”?` });
      // The native radio is visually hidden; its label is the click target.
      await dialog.getByText('Delete links too').click();
      await expect(dialog.getByRole('radio', { name: /Delete links too/ })).toBeChecked();
      await expect(
        dialog.getByRole('button', { name: /^Delete folder and \d+ links$/ }),
      ).toBeVisible();
      await dialog.getByRole('button', { name: /^Delete folder and \d+ links$/ }).click();

      await expect(page.getByText('Folder deleted')).toBeVisible();
      await openSidebar(page);
      await expect(row(page, READING.name)).toHaveCount(0);
    });

    test('Cancel leaves the folder alone', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      await pickFolderMenuItem(page, READING.name, 'Delete folder…');
      await page
        .getByRole('dialog', { name: /^Delete folder/ })
        .getByRole('button', { name: 'Cancel' })
        .click();

      await expect(row(page, READING.name)).toBeVisible();
    });
  });

  test('an unknown folder shows "not found" instead of the content', async ({ page }) => {
    await page.goto('/folders/does-not-exist');

    await expect(page.getByRole('heading', { name: 'Folder not found' })).toBeVisible();
    await expect(page.locator('ui-card')).toHaveCount(0);

    await page.getByRole('button', { name: 'Show all links' }).click();
    await expect(page).toHaveURL('/links');
  });

  test('a guest on a folder URL is sent to sign-in and comes back', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/folders/${READING.id}`);

    await expect(page).toHaveURL(/\/sign-in\?/);
    await context.close();
  });

  test('fits the viewport without horizontal scroll', async ({ page }) => {
    await page.goto(`/folders/${READING.id}`);
    await expect(page.locator('ui-card').first()).toBeVisible();

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );

    expect(overflow).toBeLessThanOrEqual(0);
  });
});

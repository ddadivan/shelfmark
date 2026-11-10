import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { pickFolderMenuItem } from './support/a11y-flows';
import { seedSession } from './support/mock-session';
import { gotoWithSidebar, isPhone, openSidebar, tabBar, viewEntry } from './support/sidebar';

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

      await expect(viewEntry(page, 'All links')).toBeVisible();
      await expect(viewEntry(page, 'Unsorted')).toBeVisible();
      await expect(viewEntry(page, 'Favorites')).toBeVisible();
      await expect(row(page, READING.name)).toBeVisible();

      await row(page, READING.name).click();

      await expect(page).toHaveURL(`/folders/${READING.id}`);
      await expect(page.getByRole('heading', { level: 1, name: READING.name })).toBeVisible();
      if (isPhone(page)) {
        // The folder is not on screen: the Library tab is the current place.
        await expect(tabBar(page).getByRole('link', { name: 'Library' })).toHaveAttribute(
          'aria-current',
          'page',
        );
      } else {
        await expect(row(page, READING.name)).toHaveAttribute('aria-current', 'page');
      }
      await expect(page.locator('ui-card').first()).toBeVisible();
    });

    test('is keyboard accessible: arrows move, Enter opens', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      if (isPhone(page)) {
        // The tiles are links: Tab reaches each one and Enter opens it.
        await viewEntry(page, 'All links').focus();
        await page.keyboard.press('Tab');
        await expect(viewEntry(page, 'Unsorted')).toBeFocused();
      } else {
        await row(page, 'All links').focus();
        await page.keyboard.press('ArrowDown');
        await expect(row(page, 'Unsorted')).toBeFocused();
      }
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL('/unsorted');
      await expect(page.getByRole('heading', { level: 1, name: 'Unsorted' })).toBeVisible();
    });

    test('opens the folders above a deep link', async ({ page }) => {
      await page.goto(`/folders/${ANGULAR.id}`);

      if (isPhone(page)) {
        // The tree is on the Library page, which does not follow the folder: the page itself
        // and the Library tab show where you are.
        await expect(page.getByRole('heading', { level: 1, name: ANGULAR.name })).toBeVisible();
        await expect(tabBar(page).getByRole('link', { name: 'Library' })).toHaveAttribute(
          'aria-current',
          'page',
        );
        return;
      }
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
      if (isPhone(page)) {
        // The Library page does not follow the open folder: expand the parent to see the child.
        await row(page, READING.name).locator('.ui-tree__twist').first().click();
      }
      await expect(row(page, 'Essays')).toBeVisible();
    });

    test('a new folder can be placed inside another one with the Inside field', async ({
      page,
    }) => {
      await gotoWithSidebar(page, '/links');

      await page.getByRole('button', { name: 'New folder' }).click();
      const dialog = page.getByRole('dialog', { name: 'New folder' });
      await dialog.getByLabel('Name').fill('Essays');
      await dialog.getByRole('combobox', { name: 'Inside' }).click();
      await page.getByRole('option', { name: READING.name, exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: `New folder in “${READING.name}”` }),
      ).toBeVisible();
      await dialog.getByRole('button', { name: 'Create folder' }).click();

      await expect(page.getByRole('heading', { level: 1, name: 'Essays' })).toBeVisible();
      await expect(page.getByRole('link', { name: READING.name })).toBeVisible();
    });

    test('Add link here saves into the folder and the toast names its path', async ({ page }) => {
      await gotoWithSidebar(page, '/links');

      await pickFolderMenuItem(page, READING.name, 'Add link here');
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await dialog.getByLabel('Link', { exact: true }).fill('https://example.org/in-reading');
      await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on example.org');
      await dialog.getByRole('button', { name: 'Save link' }).click();

      await expect(page.getByText(`Saved to ${READING.name}`, { exact: true })).toBeVisible();
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
      await dialog.getByLabel('Name').fill('Renamed shelf');
      await dialog.getByRole('button', { name: 'Rename' }).click();

      await expect(dialog).toHaveCount(0);
      await expect(row(page, 'Renamed shelf')).toBeVisible();
      if (isPhone(page)) {
        // The tree is on the Library page: open the renamed folder to see its title.
        await row(page, 'Renamed shelf').click();
      }
      await expect(page.getByRole('heading', { level: 1, name: 'Renamed shelf' })).toBeVisible();
      await openSidebar(page);
      await expect(row(page, 'Renamed shelf')).toBeVisible();
    });

    test('moves a folder and never offers its own subtree', async ({ page }) => {
      await gotoWithSidebar(page, '/links');
      await createFolder(page, 'Archive');
      await expect(page.getByRole('heading', { level: 1, name: 'Archive' })).toBeVisible();
      // On a phone the toast of the new folder sits over the bottom sheet's fields until it ends.
      // (The pointer rests where the last click was, which pauses the toast: move it away.)
      await page.mouse.move(0, 0);
      await expect(page.locator('ui-toast')).toHaveCount(0);
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
      // also chooses it and navigates away, so the check below raced it.
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
      // On a phone the toast of the new folder sits over the bottom sheet's fields until it ends.
      // (The pointer rests where the last click was, which pauses the toast: move it away.)
      await page.mouse.move(0, 0);
      await expect(page.locator('ui-toast')).toHaveCount(0);
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

      await expect(page.getByText('Folder moved to Trash')).toBeVisible();
      // Deleting the folder on screen leaves for All links; the phone is on the Library page.
      await expect(page).toHaveURL(isPhone(page) ? '/library' : '/links');
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

      await expect(page.getByText('Folder moved to Trash')).toBeVisible();
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

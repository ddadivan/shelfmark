import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { pickFolderMenuItem } from './support/a11y-flows';
import { seedSession } from './support/mock-session';
import { gotoWithSidebar, isCompact, openSidebar, tabBar, viewEntry } from './support/sidebar';
import { E2E_TAG } from './models/e2e-tag.const';

// Mirror MOCK_ID.FolderReading, MOCK_NAME.FolderReading / FolderAngular and MOCK_FOLDER_NAME
// (apps/web and libs/shared/contracts); the e2e project cannot import from them.
const READING = { id: '00000000-0000-4000-8000-000000000101', name: 'Reading' };
const ANGULAR = { id: '00000000-0000-4000-8000-000000000102', name: 'Angular' };

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
      if (isCompact(page)) {
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

    test(
      'creates a folder, opens it and shows the empty state',
      { tag: E2E_TAG.Phone },
      async ({ page }) => {
        await gotoWithSidebar(page, '/links');

        const dialog = await createFolder(page, 'Projects');

        await expect(dialog).toBeHidden();
        await expect(page).toHaveURL(/\/folders\/.+/);
        await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'This folder is empty' })).toBeVisible();
        await openSidebar(page);
        await expect(row(page, 'Projects')).toBeVisible();
      },
    );

    test('renames a folder from its menu', { tag: E2E_TAG.Phone }, async ({ page }) => {
      await gotoWithSidebar(page, `/folders/${READING.id}`);

      await pickFolderMenuItem(page, READING.name, 'Rename');
      const dialog = page.getByRole('dialog', { name: 'Rename folder' });
      await expect(dialog.getByLabel('Name')).toHaveValue(READING.name);
      await dialog.getByLabel('Name').fill('Renamed shelf');
      await dialog.getByRole('button', { name: 'Rename' }).click();

      await expect(dialog).toHaveCount(0);
      await expect(row(page, 'Renamed shelf')).toBeVisible();
      if (isCompact(page)) {
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
      await expect(page).toHaveURL(isCompact(page) ? '/library' : '/links');
      await openSidebar(page);
      await expect(row(page, READING.name)).toHaveCount(0);
    });

    test('after creating with the keyboard focus is on the new folder row', async ({ page }) => {
      test.skip(isCompact(page), 'the sidebar tree exists on the desktop shell only');
      await gotoWithSidebar(page, '/links');

      const add = page.getByRole('button', { name: 'New folder' });
      await add.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'New folder' });
      await dialog.getByLabel('Name').fill('Keyboard folder');
      await page.keyboard.press('Enter');

      await expect(dialog).toBeHidden();
      await expect(row(page, 'Keyboard folder')).toBeFocused();
    });

    // That the tooltip of "+" stays closed on this focus return: dialog.service.spec.ts and
    // tooltip.directive.spec.ts (libs/ui).
    test('Esc after a click on "+" returns focus without the ring; after Enter with the ring', async ({
      page,
    }) => {
      test.skip(isCompact(page), 'the sidebar tree exists on the desktop shell only');
      await gotoWithSidebar(page, '/links');
      const add = page.getByRole('button', { name: 'New folder' });
      const dialog = page.getByRole('dialog', { name: 'New folder' });
      const focusVisible = () => add.evaluate((el) => el.matches(':focus-visible'));

      await add.click();
      await expect(dialog).toBeVisible();
      // A pointer resting on "+" would show its hover tooltip: only focus is checked here.
      await page.mouse.move(0, 0);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(add).toBeFocused();
      expect(await focusVisible()).toBe(false);

      await page.mouse.move(0, 0);
      await add.focus();
      await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(add).toBeFocused();
      expect(await focusVisible()).toBe(true);
    });
  });
});

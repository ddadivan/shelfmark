import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';

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

  /** Waits for the enter animations: axe measures contrast on the painted colors. */
  async function settled(page: Page) {
    // String script: this project has no DOM lib, and the code runs in the browser anyway.
    await page.evaluate(
      'Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))',
    );
  }

  const row = (page: Page, name: string) =>
    page.getByRole('treeitem', { name: new RegExp(`^${name}\\b`) });

  async function createFolder(page: Page, name: string) {
    await page.getByRole('button', { name: 'New folder' }).click();
    const dialog = page.getByRole('dialog', { name: 'New folder' });
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByRole('button', { name: 'Create folder' }).click();
    return dialog;
  }

  async function openFolderMenu(page: Page, name: string, item: string) {
    await row(page, name).click({ button: 'right' });
    await page.getByRole('menuitem', { name: item }).click();
  }

  test.describe('sidebar', () => {
    test.skip(({ isMobile }) => isMobile, 'the phone drawer is a separate issue (#97)');

    test('lists the fixed rows and the folder tree, and opens a folder', async ({ page }) => {
      await page.goto('/links');

      await expect(row(page, 'All links')).toBeVisible();
      await expect(row(page, 'Unsorted')).toBeVisible();
      await expect(row(page, 'Favorites')).toBeVisible();
      await expect(row(page, READING.name)).toBeVisible();

      await row(page, READING.name).click();

      await expect(page).toHaveURL(`/folders/${READING.id}`);
      await expect(page.getByRole('heading', { level: 1, name: READING.name })).toBeVisible();
      await expect(row(page, READING.name)).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('ui-card').first()).toBeVisible();
    });

    test('is keyboard accessible: arrows move, Enter opens', async ({ page }) => {
      await page.goto('/links');

      await row(page, 'All links').focus();
      await page.keyboard.press('ArrowDown');
      await expect(row(page, 'Unsorted')).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL('/unsorted');
      await expect(page.getByRole('heading', { level: 1, name: 'Unsorted' })).toBeVisible();
    });

    test('opens the folders above a deep link', async ({ page }) => {
      await page.goto(`/folders/${ANGULAR.id}`);

      await expect(row(page, ANGULAR.name)).toBeVisible();
      await expect(row(page, ANGULAR.name)).toHaveAttribute('aria-current', 'page');
    });

    test('creates a folder, opens it and shows the empty state', async ({ page }) => {
      await page.goto('/links');

      const dialog = await createFolder(page, 'Projects');

      await expect(dialog).toBeHidden();
      await expect(page).toHaveURL(/\/folders\/.+/);
      await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'This folder is empty' })).toBeVisible();
      await expect(row(page, 'Projects')).toBeVisible();
    });

    test('creating a subfolder names the parent', async ({ page }) => {
      await page.goto('/links');

      await openFolderMenu(page, READING.name, 'New subfolder');
      const dialog = page.getByRole('dialog', { name: `New folder in “${READING.name}”` });
      await dialog.getByLabel('Name').fill('Essays');
      await dialog.getByRole('button', { name: 'Create folder' }).click();

      await expect(page.getByRole('heading', { level: 1, name: 'Essays' })).toBeVisible();
      await expect(row(page, 'Essays')).toBeVisible();
    });

    test('asks for a name', async ({ page }) => {
      await page.goto('/links');

      const dialog = await createFolder(page, '   ');

      await expect(dialog.getByText('Enter a folder name')).toBeVisible();
      await expect(dialog).toBeVisible();
    });

    test('keeps the dialog open with an error when the server refuses', async ({ page }) => {
      await page.goto('/links');

      const dialog = await createFolder(page, CREATE_FAILS);

      await expect(dialog.getByText("Couldn't create the folder")).toBeVisible();
      await expect(dialog).toBeVisible();
    });

    test('renames a folder from its menu', async ({ page }) => {
      await page.goto(`/folders/${READING.id}`);

      await openFolderMenu(page, READING.name, 'Rename');
      const dialog = page.getByRole('dialog', { name: 'Rename folder' });
      await expect(dialog.getByLabel('Name')).toHaveValue(READING.name);
      await dialog.getByLabel('Name').fill('Library');
      await dialog.getByRole('button', { name: 'Rename' }).click();

      await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
      await expect(row(page, 'Library')).toBeVisible();
    });

    test('moves a folder and never offers its own subtree', async ({ page }) => {
      await page.goto('/links');
      await createFolder(page, 'Archive');
      await expect(page.getByRole('heading', { level: 1, name: 'Archive' })).toBeVisible();

      await openFolderMenu(page, READING.name, 'Move to…');
      const dialog = page.getByRole('dialog', { name: `Move “${READING.name}”` });
      await dialog.getByRole('combobox').click();
      const options = page.getByRole('option');
      await expect(options.filter({ hasText: 'Archive' })).toBeVisible();
      await expect(options.filter({ hasText: ANGULAR.name })).toHaveCount(0);
      await expect(options.filter({ hasText: READING.name })).toHaveCount(0);
      await options.filter({ hasText: 'Archive' }).click();
      await dialog.getByRole('button', { name: 'Move' }).click();

      await expect(dialog).toBeHidden();
      await row(page, 'Archive').click();
      await expect(row(page, READING.name)).toBeVisible();
    });

    test('deleting a folder keeps its links in Unsorted by default', async ({ page }) => {
      await page.goto(`/folders/${READING.id}`);

      await openFolderMenu(page, READING.name, 'Delete folder…');
      const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
      await expect(
        dialog.getByRole('heading', { name: `Delete folder “${READING.name}”?` }),
      ).toBeVisible();
      await expect(dialog.getByText(/It has \d+ links and 1 subfolder\./)).toBeVisible();
      await expect(dialog.getByRole('radio', { name: /Move links to Unsorted/ })).toBeChecked();
      await dialog.getByRole('button', { name: 'Delete folder', exact: true }).click();

      await expect(page.getByText('Folder deleted')).toBeVisible();
      await expect(page).toHaveURL('/links');
      await expect(row(page, READING.name)).toHaveCount(0);
    });

    test('deleting a folder with its links says how many go', async ({ page }) => {
      await page.goto('/links');

      await openFolderMenu(page, READING.name, 'Delete folder…');
      const dialog = page.getByRole('dialog', { name: `Delete folder “${READING.name}”?` });
      // The native radio is visually hidden; its label is the click target.
      await dialog.getByText('Delete links too').click();
      await expect(dialog.getByRole('radio', { name: /Delete links too/ })).toBeChecked();
      await expect(
        dialog.getByRole('button', { name: /^Delete folder and \d+ links$/ }),
      ).toBeVisible();
      await dialog.getByRole('button', { name: /^Delete folder and \d+ links$/ }).click();

      await expect(page.getByText('Folder deleted')).toBeVisible();
      await expect(row(page, READING.name)).toHaveCount(0);
    });

    test('Cancel leaves the folder alone', async ({ page }) => {
      await page.goto('/links');

      await openFolderMenu(page, READING.name, 'Delete folder…');
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

      await expect(row(page, READING.name)).toBeVisible();
    });

    test('the delete dialog has no axe violations', async ({ page }, testInfo) => {
      await page.goto('/links');

      await openFolderMenu(page, READING.name, 'Delete folder…');
      await expect(page.getByRole('dialog')).toBeVisible();
      await settled(page);

      await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });
    });

    test('the create dialog has no axe violations', async ({ page }, testInfo) => {
      await page.goto('/links');

      await page.getByRole('button', { name: 'New folder' }).click();
      await expect(page.getByRole('dialog', { name: 'New folder' })).toBeVisible();
      await settled(page);

      await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });
    });
  });

  test('a folder page lists its links and has no axe violations', async ({ page }, testInfo) => {
    await page.goto(`/folders/${READING.id}`);

    await expect(page.getByRole('heading', { level: 1, name: READING.name })).toBeVisible();
    await expect(page.locator('ui-card').first()).toBeVisible();

    await expectNoBlockingViolations(page, testInfo, {
      disabledRules: ['label-content-name-mismatch'],
    });
  });

  test('an unknown folder shows "not found" instead of the content', async ({ page }, testInfo) => {
    await page.goto('/folders/does-not-exist');

    await expect(page.getByRole('heading', { name: 'Folder not found' })).toBeVisible();
    await expect(page.locator('ui-card')).toHaveCount(0);
    await expectNoBlockingViolations(page, testInfo, {
      disabledRules: ['label-content-name-mismatch'],
    });

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

  test('has no axe violations in the dark theme', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: COLOR_SCHEME.Dark });
    await page.goto(`/folders/${READING.id}`);
    await expect(page.locator('ui-card').first()).toBeVisible();

    await expectNoBlockingViolations(page, testInfo, {
      disabledRules: ['label-content-name-mismatch'],
    });
  });
});

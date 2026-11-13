import { MOCK_TRASH_SCENARIO } from '../src/models/mock-trash-scenario.const';
import { openFeed } from '../src/support/a11y-flows';
import { openSettingsSection } from '../src/support/mock-session';
import { openTrash } from '../src/support/trash';
import { expect, expectScreen, test } from './support/visual-test';
import { openEmptyLibraryAsNewUser } from './support/visual-flows';

test.describe('visual: settings, trash and empty states (mock API)', () => {
  test('settings, appearance', async ({ page }) => {
    await openFeed(page);
    await openSettingsSection(page, 'Appearance');
    await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();

    await expectScreen(page, 'settings-appearance');
  });

  test('settings, library', async ({ page }) => {
    await openFeed(page);
    await openSettingsSection(page, 'Library');
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Show folder counts' })).toBeVisible();

    await expectScreen(page, 'settings-library');
  });

  test('trash with items', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [MOCK_TRASH_SCENARIO.key, MOCK_TRASH_SCENARIO.oldItems],
    );
    await openFeed(page);
    await openTrash(page);
    await expect(page.locator('app-trash-row').first()).toBeVisible();

    await expectScreen(page, 'trash');
  });

  test('empty trash', async ({ page }) => {
    await openFeed(page);
    await openTrash(page);
    await expect(page.getByRole('heading', { name: 'Trash is empty' })).toBeVisible();

    await expectScreen(page, 'trash-empty');
  });

  test('empty library of a new user', async ({ page }) => {
    await openEmptyLibraryAsNewUser(page);

    await expectScreen(page, 'library-empty');
  });
});

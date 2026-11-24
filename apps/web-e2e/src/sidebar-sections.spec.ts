import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';

// #556: Pinned, Folders and Tags fold under their heading in the desktop sidebar, and this device
// remembers which ones (Shelf: Tags folded at first, the others open).
test.describe('foldable sidebar sections (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    test.skip(isCompact(page), 'the sidebar exists from 64em; the phone pages never fold');
    await seedSession(page);
  });

  test('folds the sections with their chevrons and keeps them folded after a reload', async ({
    page,
  }) => {
    await page.goto('/links');
    const sidebar = page.getByRole('navigation', { name: 'Library' });
    const foldersTree = sidebar.getByRole('tree', { name: 'Folders' });
    const firstFolder = foldersTree.getByRole('treeitem').first();
    await expect(firstFolder).toBeVisible();

    // Pin a folder so the Pinned section shows.
    await firstFolder.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Pin to sidebar' }).click();
    const pinned = sidebar.getByRole('region', { name: 'Pinned' });
    await expect(pinned.getByRole('link').first()).toBeVisible();

    const pinnedToggle = sidebar.getByRole('button', { name: 'Show or hide pinned' });
    const foldersToggle = sidebar.getByRole('button', { name: 'Show or hide folders' });
    const tagsToggle = sidebar.getByRole('button', { name: 'Show or hide tags' });
    for (const toggle of [pinnedToggle, foldersToggle]) {
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    }
    await expect(tagsToggle).toHaveAttribute('aria-expanded', 'false');
    await tagsToggle.click();
    await expect(tagsToggle).toHaveAttribute('aria-expanded', 'true');

    await foldersToggle.click();
    await expect(foldersToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(foldersTree).toBeHidden();
    // The keyboard works too: Enter on the focused chevron folds Pinned.
    await pinnedToggle.focus();
    await page.keyboard.press('Enter');
    await expect(pinnedToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(pinned.getByRole('link')).toHaveCount(0);
    // The headings and the "+" buttons stay.
    await expect(sidebar.getByRole('heading', { name: 'Folders' })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: 'New folder' })).toBeVisible();

    // The mock keeps pins in memory, so after the reload only the stored choice tells of Pinned.
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem('sm-sidebar-collapsed'))).toBe(
      '["folders","pinned"]',
    );
    await expect(foldersToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(tagsToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(foldersTree).toBeHidden();
    await expect(sidebar.getByRole('list', { name: 'Tags' })).toBeVisible();

    await foldersToggle.click();
    await expect(foldersToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(firstFolder).toBeVisible();
  });
});

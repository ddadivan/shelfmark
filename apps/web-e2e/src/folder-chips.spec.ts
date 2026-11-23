import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { openFeed } from './support/a11y-flows';
import { openSidebar } from './support/sidebar';
import { expect, test } from './support/test';

const READING = MOCK_FIXTURE.readingName;

// Folder names on cards (meta line) and rows (chip) of mixed feeds (#418).
test.describe('folder names on cards (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test(
    'All links names the folder of each filed link; the folder feed does not',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openFeed(page);
      // Shelf card: the folder is a span in the meta line (icon, name, hidden "In folder" hint).
      const chips = page.locator('app-link-card .link-card__folder');
      await expect(chips.first()).toBeVisible();
      await expect(chips.filter({ hasText: READING }).first()).toBeVisible();
      await expect(page.locator('app-link-card ui-folder-chip')).toHaveCount(0);
      // Every third mock link is unsorted: those cards carry no folder.
      expect(await chips.count()).toBeLessThan(await page.locator('app-link-card').count());
      // The folder never makes the meta line taller: one line, the name cut short.
      const box = await chips.first().boundingBox();
      expect(box?.height ?? 0).toBeLessThanOrEqual(26);

      await openSidebar(page);
      await page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) }).click();
      await expect(page).toHaveURL(`/folders/${MOCK_FIXTURE.readingId}`);
      await expect(page.locator('app-link-card').first()).toBeVisible();
      await expect(page.locator('.link-card__folder')).toHaveCount(0);
    },
  );

  test('the list view shows the chip beside the site', async ({ page }) => {
    await openFeed(page);
    await page.getByRole('radio', { name: 'List' }).dispatchEvent('click');
    const chip = page.locator('app-link-row ui-folder-chip').filter({ hasText: READING }).first();
    await expect(chip).toBeVisible();
  });
});

import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { openFeed } from './support/a11y-flows';
import { openSidebar } from './support/sidebar';
import { expect, test } from './support/test';

const READING = MOCK_FIXTURE.readingName;

// Folder chips on cards and rows of mixed feeds (#418).
test.describe('folder chips (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test(
    'All links names the folder of each filed link; the folder feed does not',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openFeed(page);
      const chips = page.locator('app-link-card ui-folder-chip');
      await expect(chips.first()).toBeVisible();
      await expect(chips.filter({ hasText: READING }).first()).toBeVisible();
      // Every third mock link is unsorted: those cards carry no chip.
      expect(await chips.count()).toBeLessThan(await page.locator('app-link-card').count());
      // A chip never makes the card taller than its neighbours: one line, the name cut short.
      const box = await chips.first().boundingBox();
      expect(box?.height ?? 0).toBeLessThanOrEqual(26);

      await openSidebar(page);
      await page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) }).click();
      await expect(page).toHaveURL(`/folders/${MOCK_FIXTURE.readingId}`);
      await expect(page.locator('app-link-card').first()).toBeVisible();
      await expect(page.locator('ui-folder-chip')).toHaveCount(0);
    },
  );

  test('the list view shows the chip beside the site', async ({ page }) => {
    await openFeed(page);
    await page.getByRole('radio', { name: 'List' }).dispatchEvent('click');
    const chip = page.locator('app-link-row ui-folder-chip').filter({ hasText: READING }).first();
    await expect(chip).toBeVisible();
  });
});

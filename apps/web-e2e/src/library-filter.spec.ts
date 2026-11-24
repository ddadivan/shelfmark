import { type Page } from '@playwright/test';
import { openFeed } from './support/a11y-flows';
import { openMoreMenu } from './support/library-toolbar';
import { E2E_TAG } from './models/e2e-tag.const';
import { expect, test } from './support/test';

// Shelf ⋯ menu: "Filter…" opens the Filter popover (Type, Saved, Tags, Only favorites), "Select
// links" (X) starts selecting with nothing picked.
test.describe('library Filter and Select links (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  const filter = (page: Page) => page.getByRole('dialog', { name: 'Filter' });

  async function openFilter(page: Page): Promise<void> {
    await openMoreMenu(page);
    await page.getByRole('menuitem', { name: /^Filter…/ }).click();
    await expect(filter(page)).toBeVisible();
  }

  test(
    'Filter sets the type, the period, a tag and favorites; the chips above the feed undo them',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openFeed(page);
      await openFilter(page);

      await filter(page).getByRole('button', { name: 'Articles', exact: true }).click();
      await expect(page).toHaveURL(/[?&]kind=article(&|$)/);
      await expect(
        filter(page).getByRole('button', { name: 'Articles', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await filter(page).getByRole('radio', { name: 'Past month' }).check();
      await expect(page).toHaveURL(/[?&]saved=month(&|$)/);
      await filter(page).getByRole('switch', { name: 'Only favorites' }).click();
      await expect(page).toHaveURL(/[?&]fav=1(&|$)/);
      await page.keyboard.press('Escape');
      await expect(filter(page)).toBeHidden();

      const chips = page.getByRole('group', { name: 'Filter' });
      await expect(chips).toContainText('Articles');
      await expect(chips).toContainText('Past month');
      await expect(chips).toContainText('Only favorites');
      await openMoreMenu(page);
      await expect(page.getByRole('menuitem', { name: 'Filter… (3)' })).toBeVisible();
      await page.keyboard.press('Escape');

      await chips.getByRole('button', { name: 'Remove filter: Past month' }).click();
      await expect(page).not.toHaveURL(/saved=/);
      await chips.getByRole('button', { name: 'Clear filter' }).click();
      await expect(page).not.toHaveURL(/kind=|fav=/);
    },
  );

  test('Select links and X start selecting with nothing picked; Esc ends it', async ({ page }) => {
    await openFeed(page);
    await openMoreMenu(page);
    await page.getByRole('menuitem', { name: 'Select links' }).click();

    const bar = page.getByRole('toolbar', { name: /selected/ });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.locator('ui-card').first().getByRole('checkbox')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(bar.getByRole('button', { name: 'Delete' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await page.keyboard.press('Escape');
    await expect(bar).toBeHidden();

    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('x');
    await expect(bar).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bar).toBeHidden();
  });
});

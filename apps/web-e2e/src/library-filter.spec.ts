import { type Page } from '@playwright/test';
import { openFeed } from './support/a11y-flows';
import { seedSession } from './support/mock-session';
import { filterButton, saveThisViewButton, selectButton } from './support/library-toolbar';
import { E2E_TAG } from './models/e2e-tag.const';
import { expect, test } from './support/test';

// Shelf toolbar: "Filter" opens the Filter popover (Type, Saved, Tags, Only favorites), "Select
// links" (X) starts selecting with nothing picked.
test.describe('library Filter and Select links (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  const filter = (page: Page) => page.getByRole('dialog', { name: 'Filter' });

  async function openFilter(page: Page): Promise<void> {
    await filterButton(page).click();
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
      await expect(page.getByRole('button', { name: 'Filter · 3' })).toBeVisible();
      // Something to save: the toolbar offers Save view (not on a phone, which has the chip).

      await chips.getByRole('button', { name: 'Remove filter: Past month' }).click();
      await expect(page).not.toHaveURL(/saved=/);
      await chips.getByRole('button', { name: 'Clear filter' }).click();
      await expect(page).not.toHaveURL(/kind=|fav=/);
    },
  );

  test('Select links and X start selecting with nothing picked; Esc ends it', async ({ page }) => {
    await openFeed(page);
    await selectButton(page).click();

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

  test(
    'a filter that matches nothing keeps the toolbar and the empty state, in a folder too',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      // Mirrors MOCK_FOLDERS (the e2e project cannot import them): the Reading folder.
      await seedSession(page);
      await page.goto(
        '/folders/00000000-0000-4000-8000-000000000101?kind=video&saved=week&tag=docs',
      );

      const empty = page.getByText('Nothing matches these filters');
      await expect(empty).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
      // The tools stay: Filter (to change the filters), View and the view switch; Save view too
      // (the phone has the chip). Select cannot act on nothing.
      await expect(filterButton(page)).toBeVisible();
      await expect(saveThisViewButton(page)).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Headlines', exact: true })).toBeVisible();
      await expect(selectButton(page)).toHaveCount(0);

      await page.getByRole('button', { name: 'Clear filters' }).click();
      await expect(page).not.toHaveURL(/kind=|saved=|tag=/);
      await expect(selectButton(page)).toBeVisible();
    },
  );
});

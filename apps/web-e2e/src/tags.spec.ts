import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { pickTagMenuItem } from './support/a11y-flows';
import { seedSession } from './support/mock-session';
import { gotoWithTags, isCompact } from './support/sidebar';
import { E2E_TAG } from './models/e2e-tag.const';

// Mirror MOCK_NAME.TagDocs (libs/shared/contracts); the e2e project cannot import from it.
const DOCS = 'docs';

test.describe('tags (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  // The tags section: in the sidebar, or the page of the Tags tab on a phone.
  const sidebar = (page: Page) => page.locator('app-sidebar-tags');
  const chip = (page: Page, name: string) =>
    sidebar(page).getByRole('button', { name, exact: true });

  async function addTag(page: Page, name: string) {
    await sidebar(page).getByRole('button', { name: 'New tag' }).click();
    const field = sidebar(page).getByRole('textbox', { name: 'New tag' });
    await field.fill(name);
    await field.press('Enter');
  }

  test.describe('sidebar', () => {
    test(
      'adds a tag with Enter, refuses a duplicate ignoring case and cancels with Esc',
      { tag: E2E_TAG.Phone },
      async ({ page }) => {
        await gotoWithTags(page, '/links');

        await addTag(page, 'winter sale');
        await expect(chip(page, 'winter-sale')).toBeVisible();

        await addTag(page, 'WINTER-SALE');
        await expect(sidebar(page).getByText(/There.s already a tag/)).toBeVisible();
        await sidebar(page).getByRole('textbox', { name: 'New tag' }).press('Escape');
        await expect(sidebar(page).getByRole('textbox', { name: 'New tag' })).toHaveCount(0);
        await expect(sidebar(page).getByRole('button', { name: 'New tag' })).toBeFocused();
      },
    );

    // That the tooltip of "+" stays closed on this focus return: focus-return.spec.ts and
    // tooltip.directive.spec.ts (libs/ui).
    test('Esc after a click on "+" returns focus without the ring; after Enter with the ring', async ({
      page,
    }) => {
      test.skip(isCompact(page), 'the Tags tab is a page: the desktop sidebar path is checked');
      await gotoWithTags(page, '/links');
      const add = sidebar(page).getByRole('button', { name: 'New tag' });
      const focusVisible = () => add.evaluate((el) => el.matches(':focus-visible'));
      const field = sidebar(page).getByRole('textbox', { name: 'New tag' });

      await add.click();
      // A pointer resting on "+" would show its hover tooltip: only focus is checked here.
      await page.mouse.move(0, 0);
      await field.press('Escape');
      await expect(add).toBeFocused();
      expect(await focusVisible()).toBe(false);

      await page.mouse.move(0, 0);
      await add.focus();
      await page.keyboard.press('Enter');
      await field.press('Escape');
      await expect(add).toBeFocused();
      expect(await focusVisible()).toBe(true);
    });

    test(
      'a click on a tag opens the links with that tag, and the filter can be cleared',
      { tag: E2E_TAG.Phone },
      async ({ page }) => {
        await gotoWithTags(page, '/links');

        await chip(page, DOCS).click();

        await expect(page).toHaveURL(/\/links\?tag=docs$/);
        const filter = page.getByRole('group', { name: 'Active filters' });
        await expect(filter).toBeVisible();
        await filter.getByRole('button', { name: 'Clear filter' }).click();
        await expect(page).toHaveURL(/\/links$/);
        await expect(filter).toHaveCount(0);
      },
    );

    test('the "…" button opens the tag menu', { tag: E2E_TAG.Phone }, async ({ page }) => {
      await gotoWithTags(page, '/links');

      // The button is clipped away until the chip is hovered.
      await chip(page, DOCS).hover();
      await page.getByRole('button', { name: `Actions for tag ${DOCS}` }).click();

      await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    });

    test('deletes after a confirmation, and Undo brings the tag back', async ({ page }) => {
      await gotoWithTags(page, '/links');

      await pickTagMenuItem(page, DOCS, 'Delete tag');
      const dialog = page.getByRole('alertdialog');
      await expect(dialog).toContainText('removed from');
      await dialog.getByRole('button', { name: 'Delete tag' }).click();

      await expect(chip(page, DOCS)).toHaveCount(0);
      // The toast stays above the open drawer on a phone.
      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(chip(page, DOCS)).toBeVisible();
    });
  });
});

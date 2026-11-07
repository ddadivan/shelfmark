import { expect, test, type Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { closeSidebar, gotoWithSidebar, openSidebar } from './support/sidebar';

// Mirror MOCK_NAME.TagDocs / TagRecipes and MOCK_TAG_NAME (apps/web and libs/shared/contracts);
// the e2e project cannot import from them.
const DOCS = 'docs';
const RECIPES = 'recipes';
const CREATE_FAILS = 'fail-on-create';

const TAG_TOP_COUNT = 8;

for (const colorScheme of Object.values(COLOR_SCHEME)) {
  test.describe(`tags (mock API, ${colorScheme} theme)`, () => {
    test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
    test.use({ colorScheme });

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

    const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Library' });
    const chip = (page: Page, name: string) =>
      sidebar(page).getByRole('button', { name, exact: true });

    async function addTag(page: Page, name: string) {
      await sidebar(page).getByRole('button', { name: 'New tag' }).click();
      const field = sidebar(page).getByRole('textbox', { name: 'New tag' });
      await field.fill(name);
      await field.press('Enter');
    }

    async function openTagMenu(page: Page, name: string, item: string) {
      await chip(page, name).click({ button: 'right' });
      await page.getByRole('menuitem', { name: item }).click();
    }

    test.describe('sidebar', () => {
      test('lists the tags below the folders', async ({ page }) => {
        await gotoWithSidebar(page, '/links');

        await expect(sidebar(page).getByRole('heading', { name: 'Tags' })).toBeVisible();
        await expect(chip(page, DOCS)).toBeVisible();
        await expect(chip(page, RECIPES)).toBeVisible();
      });

      test('adds a tag with Enter, refuses a duplicate ignoring case and cancels with Esc', async ({
        page,
      }) => {
        await gotoWithSidebar(page, '/links');

        await addTag(page, 'winter sale');
        await expect(chip(page, 'winter-sale')).toBeVisible();

        await addTag(page, 'WINTER-SALE');
        await expect(sidebar(page).getByText(/There.s already a tag/)).toBeVisible();
        await sidebar(page).getByRole('textbox', { name: 'New tag' }).press('Escape');
        await expect(sidebar(page).getByRole('textbox', { name: 'New tag' })).toHaveCount(0);
        await expect(sidebar(page).getByRole('button', { name: 'New tag' })).toBeFocused();
      });

      test('shows an error when creating fails', async ({ page }) => {
        await gotoWithSidebar(page, '/links');

        await addTag(page, CREATE_FAILS);

        await expect(sidebar(page).getByText(/Couldn.t create the tag/)).toBeVisible();
      });

      test('shows the 8 most used tags and folds the rest behind "+ N more"', async ({ page }) => {
        await gotoWithSidebar(page, '/links');
        const visible = sidebar(page).getByRole('list', { name: 'Tags' }).getByRole('button');
        // Make sure there are more than the top count.
        for (let n = 0; n < TAG_TOP_COUNT; n++) {
          await addTag(page, `extra-${n}`);
          // The field closes once the tag is saved. New tags have no links, so they sort last.
          await expect(sidebar(page).getByRole('textbox', { name: 'New tag' })).toHaveCount(0);
        }

        const more = sidebar(page).getByRole('button', { name: /^\+ \d+ more$/ });
        await expect(more).toBeVisible();
        await expect(more).toHaveAttribute('aria-expanded', 'false');
        await expect(chip(page, 'extra-7')).toHaveCount(0);
        await more.click();
        await expect(chip(page, 'extra-7')).toBeVisible();
        await sidebar(page).getByRole('button', { name: 'Show less' }).click();
        await expect(chip(page, 'extra-7')).toHaveCount(0);
        await expect(more).toBeVisible();
      });

      test('a click on a tag opens the links with that tag, and the filter can be cleared', async ({
        page,
      }) => {
        await gotoWithSidebar(page, '/links');

        await chip(page, DOCS).click();

        await expect(page).toHaveURL(/\/links\?tag=docs$/);
        const filter = page.getByRole('group', { name: 'Active filters' });
        await expect(filter).toBeVisible();
        await filter.getByRole('button', { name: 'Clear filter' }).click();
        await expect(page).toHaveURL(/\/links$/);
        await expect(filter).toHaveCount(0);
      });

      test('the menu offers show, rename, merge and delete from a right click', async ({
        page,
      }, info) => {
        await gotoWithSidebar(page, '/links');

        await chip(page, DOCS).click({ button: 'right' });

        for (const name of ['Show links', 'Rename', 'Merge into another tag…', 'Delete tag']) {
          await expect(page.getByRole('menuitem', { name })).toBeVisible();
        }
        await settled(page);
        await expectNoBlockingViolations(page, info, { include: '[role="menu"]' });
        await page.keyboard.press('Escape');
      });

      test('the "…" button opens the same menu', async ({ page }) => {
        await gotoWithSidebar(page, '/links');

        // The button is clipped away until the chip is hovered.
        await chip(page, DOCS).hover();
        await page.getByRole('button', { name: `Actions for tag ${DOCS}` }).click();

        await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
      });

      test('renames a tag in place', async ({ page }) => {
        await gotoWithSidebar(page, '/links');

        await openTagMenu(page, DOCS, 'Rename');
        const field = sidebar(page).getByRole('textbox', { name: 'Tag name' });
        await field.fill('manuals');
        await field.press('Enter');

        await expect(chip(page, 'manuals')).toBeVisible();
        await expect(chip(page, DOCS)).toHaveCount(0);
      });

      test('a rename into an existing name offers to merge instead', async ({ page }) => {
        await gotoWithSidebar(page, '/links');

        await openTagMenu(page, DOCS, 'Rename');
        const field = sidebar(page).getByRole('textbox', { name: 'Tag name' });
        await field.fill('Recipes');
        await field.press('Enter');

        await expect(sidebar(page).getByText(/already a tag .recipes./)).toBeVisible();
        await sidebar(page)
          .getByRole('button', { name: /Merge into .recipes./ })
          .click();

        await expect(chip(page, DOCS)).toHaveCount(0);
        await expect(chip(page, RECIPES)).toBeVisible();
      });

      test('merges through the dialog', async ({ page }, info) => {
        await gotoWithSidebar(page, '/links');

        await openTagMenu(page, DOCS, 'Merge into another tag…');
        const dialog = page.getByRole('dialog', { name: /Merge/ });
        await expect(dialog).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, info, { include: '.cdk-dialog-container' });

        await dialog.getByRole('combobox', { name: 'Merge into' }).click();
        await page.getByRole('option', { name: RECIPES }).click();
        await dialog.getByRole('button', { name: 'Merge', exact: true }).click();

        await expect(dialog).toHaveCount(0);
        await expect(chip(page, DOCS)).toHaveCount(0);
      });

      test('deletes after a confirmation, and Undo brings the tag back', async ({ page }, info) => {
        await gotoWithSidebar(page, '/links');

        await openTagMenu(page, DOCS, 'Delete tag');
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toContainText('removed from');
        await settled(page);
        await expectNoBlockingViolations(page, info, { include: '.cdk-dialog-container' });
        await dialog.getByRole('button', { name: 'Delete tag' }).click();

        await expect(chip(page, DOCS)).toHaveCount(0);
        // On a phone the open drawer covers the toast and hides the page.
        await closeSidebar(page);
        await page.getByRole('button', { name: 'Undo' }).click();
        await openSidebar(page);
        await expect(chip(page, DOCS)).toBeVisible();
      });

      test('the inline add field has no axe violations', async ({ page }, info) => {
        await gotoWithSidebar(page, '/links');

        await sidebar(page).getByRole('button', { name: 'New tag' }).click();
        await expect(sidebar(page).getByRole('textbox', { name: 'New tag' })).toBeFocused();
        await settled(page);

        await expectNoBlockingViolations(page, info, { include: 'app-sidebar' });
      });
    });

    test.describe('filter', () => {
      test('?tag= filters the feed and shows removable chips', async ({ page }, info) => {
        await page.goto(`/links?tag=${DOCS}&tag=${RECIPES}`);

        const filter = page.getByRole('group', { name: 'Active filters' });
        await expect(filter.getByText(DOCS, { exact: true })).toBeVisible();
        await expect(filter.getByText(RECIPES, { exact: true })).toBeVisible();

        await filter.getByRole('button', { name: `Remove tag filter ${RECIPES}` }).click();
        await expect(page).toHaveURL(/\/links\?tag=docs$/);

        await expectNoBlockingViolations(page, info, {
          disabledRules: ['label-content-name-mismatch'],
        });
      });

      test('shows an empty state when no link has all the tags', async ({ page }) => {
        await page.goto(`/links?tag=${DOCS}&tag=${RECIPES}`);

        await expect(page.getByRole('heading', { name: 'No links with these tags' })).toBeVisible();
        await page.getByRole('button', { name: 'Clear filter' }).last().click();
        await expect(page).toHaveURL(/\/links$/);
      });

      test('fits the viewport without horizontal scroll', async ({ page }) => {
        await page.goto(`/links?tag=${DOCS}`);
        await expect(page.getByRole('group', { name: 'Active filters' })).toBeVisible();

        const overflow = await page.evaluate<number>(
          '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
        );

        expect(overflow).toBeLessThanOrEqual(0);
      });
    });

    test.describe('add-link dialog', () => {
      test('suggests existing tags with their counts and offers to create a new one', async ({
        page,
      }, info) => {
        await page.goto('/links');
        await page.getByRole('button', { name: 'Add link' }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Add link' });

        const input = dialog.getByRole('combobox', { name: 'Tags' });
        await input.fill('doc');
        await expect(page.getByRole('option', { name: /docs/ })).toBeVisible();
        await input.fill('brand new');
        await expect(page.getByRole('option', { name: /Create tag .brand new./ })).toBeVisible();
        await input.press('Enter');

        await expect(dialog.getByText('brand-new', { exact: true })).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, info, { include: '.cdk-dialog-container' });
      });
    });
  });
}

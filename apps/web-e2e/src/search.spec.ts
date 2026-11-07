import { expect, test, type Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';

// Mirror the contract mock links (libs/shared/contracts/src/testing); the e2e project cannot
// import from them.
const ANGULAR_TITLE = 'Angular overview';
const PASTA_TITLE = 'Simple pasta';
// Only the note of the Angular link has it: the search covers notes.
const NOTE_WORD = 'signals';

for (const colorScheme of Object.values(COLOR_SCHEME)) {
  test.describe(`search (mock API, ${colorScheme} theme)`, () => {
    test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
    test.use({ colorScheme });

    test.beforeEach(async ({ page }) => {
      await seedSession(page);
    });

    /** Waits for the enter animations: axe measures contrast on the painted colors. */
    async function settled(page: Page) {
      await page.evaluate(
        'Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))',
      );
    }

    const searchButton = (page: Page) => page.getByRole('button', { name: 'Search', exact: true });
    const searchField = (page: Page) =>
      page.getByRole('combobox', { name: 'Search links, folders and tags' });

    test.describe('library page', () => {
      test('filters the feed by the query, in the note too, with a Search chip', async ({
        page,
      }) => {
        await page.goto(`/links?q=${NOTE_WORD}`);

        await expect(page.getByRole('main').getByText(ANGULAR_TITLE)).toBeVisible();
        await expect(page.getByRole('main').getByText(PASTA_TITLE)).toHaveCount(0);
        await expect(page.getByRole('group', { name: 'Active filters' })).toContainText(
          `Search: ${NOTE_WORD}`,
        );
        await expect(page).toHaveTitle(new RegExp(`^Search: ${NOTE_WORD}`));
      });

      test('says nothing was found and clears the search', async ({ page }, testInfo) => {
        await page.goto('/links?q=zzzzqq');

        await expect(
          page.getByRole('heading', { name: 'Nothing found for “zzzzqq”' }),
        ).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, testInfo, {
          disabledRules: ['label-content-name-mismatch'],
        });

        await page.getByRole('button', { name: 'Clear search' }).click();
        await expect(page).toHaveURL(/\/links$/);
        await expect(page.getByRole('main').getByText(ANGULAR_TITLE)).toBeVisible();
      });

      test('sorts by title from the menu and keeps it in the URL', async ({ page }) => {
        await page.goto('/links');
        await expect(page.getByRole('main').getByText(ANGULAR_TITLE)).toBeVisible();

        await page.getByRole('button', { name: /^Sort: / }).click();
        await page.getByRole('menuitemradio', { name: 'Title A–Z' }).click();

        await expect(page).toHaveURL(/\/links\?sort=title$/);
        await expect(page.getByRole('button', { name: 'Sort: Title A–Z' })).toBeVisible();
      });
    });

    test.describe('search dialog', () => {
      test('opens from the header, finds links, folders and tags, and returns focus on Esc', async ({
        page,
      }, testInfo) => {
        await page.goto('/links');
        await searchButton(page).click();

        await searchField(page).fill(NOTE_WORD);
        await expect(page.getByRole('option', { name: new RegExp(ANGULAR_TITLE) })).toBeVisible();
        await expect(page.getByRole('listbox')).not.toHaveAttribute('aria-busy', 'true');
        await settled(page);
        await expectNoBlockingViolations(page, testInfo, {
          disabledRules: ['label-content-name-mismatch'],
        });

        await searchField(page).press('Escape');
        await expect(searchField(page)).toHaveCount(0);
        await expect(searchButton(page)).toBeFocused();
      });

      test('opens with Ctrl+K, moves with the arrows and opens a link in a new tab with Enter', async ({
        page,
        context,
        isMobile,
      }) => {
        test.skip(isMobile, 'no keyboard on the phone project');
        await page.goto('/links');

        await page.keyboard.press('Control+k');
        await searchField(page).fill('pasta');
        await expect(page.getByRole('option', { name: new RegExp(PASTA_TITLE) })).toBeVisible();
        await searchField(page).press('ArrowDown');
        const opened = context.waitForEvent('page');
        await searchField(page).press('Enter');

        expect((await opened).url()).toContain('example.com/recipes/pasta');
        await expect(searchField(page)).toHaveCount(0);
      });

      test('shows the empty state for a query without results', async ({ page }) => {
        await page.goto('/links');
        await searchButton(page).click();

        await searchField(page).fill('zzzzqq');

        await expect(page.getByText('Nothing found for “zzzzqq”')).toBeVisible();
      });
    });
  });
}

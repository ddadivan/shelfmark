import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';

// Mirror the contract mock links (libs/shared/contracts/src/testing); the e2e project cannot
// import from them.
const ANGULAR_TITLE = 'Angular overview';
const PASTA_TITLE = 'Simple pasta';
// Only the note of the Angular link has it: the search covers notes.
const NOTE_WORD = 'signals';

test.describe('search (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page, context }) => {
    await seedSession(page);
    // Opened links go to external hosts: answer them locally so the popup commits at once.
    await context.route('**/example.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>ok</title>' }),
    );
  });

  const searchButton = (page: Page) => page.getByRole('button', { name: 'Search', exact: true });
  const searchField = (page: Page) =>
    page.getByRole('combobox', { name: 'Search links, folders and tags' });

  test.describe('library page', () => {
    test('filters the feed by the query, in the note too, with a Search chip', async ({ page }) => {
      await page.goto(`/links?q=${NOTE_WORD}`);

      await expect(page.getByRole('main').getByText(ANGULAR_TITLE)).toBeVisible();
      await expect(page.getByRole('main').getByText(PASTA_TITLE)).toHaveCount(0);
      await expect(page.getByRole('group', { name: 'Active filters' })).toContainText(
        `Search: ${NOTE_WORD}`,
      );
      await expect(page).toHaveTitle(new RegExp(`^Search: ${NOTE_WORD}`));
    });

    test('says nothing was found and clears the search', async ({ page }) => {
      await page.goto('/links?q=zzzzqq');

      await expect(page.getByRole('heading', { name: 'Nothing found for “zzzzqq”' })).toBeVisible();

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
    }) => {
      await page.goto('/links');
      await searchButton(page).click();

      await searchField(page).fill(NOTE_WORD);
      await expect(page.getByRole('option', { name: new RegExp(ANGULAR_TITLE) })).toBeVisible();
      await expect(page.getByRole('listbox')).not.toHaveAttribute('aria-busy', 'true');

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

      await expect(searchButton(page)).toBeVisible();
      await page.keyboard.press('Control+k');
      await searchField(page).fill('pasta');
      await expect(page.getByRole('option', { name: new RegExp(PASTA_TITLE) })).toBeVisible();
      await searchField(page).press('ArrowDown');
      const opened = context.waitForEvent('page');
      await searchField(page).press('Enter');

      const popup = await opened;
      await popup.waitForURL(/example\.com\/recipes\/pasta/);
      await expect(searchField(page)).toHaveCount(0);
    });

    test('sends a modified click to a new-tab anchor with Ctrl+Enter and keeps the dialog open', async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'no keyboard on the phone project');
      // Whether a synthetic modified click really opens a background tab is the browser's call
      // (it does in desktop Chromium, not on every headless runner), so assert what the app
      // sends: the click event and the anchor it goes to.
      await page.addInitScript(`
          window.__bgClicks = [];
          const dispatch = HTMLAnchorElement.prototype.dispatchEvent;
          HTMLAnchorElement.prototype.dispatchEvent = function (event) {
            window.__bgClicks.push({
              type: event.type,
              modified: event.ctrlKey || event.metaKey,
              href: this.href,
              target: this.target,
              rel: this.rel,
            });
            return dispatch.call(this, event);
          };
        `);
      await page.goto('/links');
      await expect(searchButton(page)).toBeVisible();
      await searchButton(page).click();
      await searchField(page).fill('pasta');
      await expect(page.getByRole('option', { name: new RegExp(PASTA_TITLE) })).toBeVisible();
      await searchField(page).press('ArrowDown');

      await searchField(page).press('Control+Enter');

      await expect.poll(() => page.evaluate('window.__bgClicks.length')).toBeGreaterThan(0);
      const clicks =
        await page.evaluate<
          { type: string; modified: boolean; href: string; target: string; rel: string }[]
        >('window.__bgClicks');
      expect(clicks[0]).toMatchObject({
        type: 'click',
        modified: true,
        target: '_blank',
        rel: 'noopener noreferrer',
      });
      expect(clicks[0].href).toContain('example.com/recipes/pasta');
      await expect(searchField(page)).toBeVisible();
    });

    test('shows the empty state for a query without results', async ({ page }) => {
      await page.goto('/links');
      await searchButton(page).click();

      await searchField(page).fill('zzzzqq');

      await expect(page.getByText('Nothing found for “zzzzqq”')).toBeVisible();
    });
  });
});

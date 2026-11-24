import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { SEARCH_FIELD_NAME } from './support/search-button';

// Mirrors the contract mock links (libs/shared/contracts/src/testing).
const PASTA_TITLE = 'Simple pasta';
const NOTE_WORD = 'signals';

const WIDE = { width: 1440, height: 900 } as const;
const NARROW_DESKTOP = { width: 1180, height: 800 } as const;

// The header search (Shelf block 3, `03-search.html`): from 64em a field that filters the library
// feed in place (`?q=`); focused while empty it opens "Recent searches". Tablet and phone keep the
// full-screen search of the mobile shell (mobile.spec.ts, search.spec.ts).
test.describe('inline search (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'the mobile shell has no header search');

  test.beforeEach(async ({ page, context }) => {
    await seedSession(page);
    await context.route('**/example.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>ok</title>' }),
    );
  });

  const field = (page: Page) => page.getByRole('combobox', { name: SEARCH_FIELD_NAME });
  const recent = (page: Page) => page.getByRole('listbox', { name: 'Recent searches' });

  /** Searches once with Enter, then clears the field: the text is a recent search now. */
  async function searchOnce(page: Page, text: string): Promise<void> {
    await field(page).fill(text);
    await field(page).press('Enter');
    await expect(page).toHaveURL(new RegExp(`[?&]q=${text}`));
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(field(page)).toHaveValue('');
  }

  test.describe('from 80em (1440 x 900)', () => {
    test.use({ viewport: WIDE });

    test('typing filters the feed in place: ?q=, the Search title and the count, no panel or dialog', async ({
      page,
    }) => {
      await page.goto('/links');
      await expect(page.locator('ui-card').first()).toBeVisible();
      await field(page).fill(NOTE_WORD);

      await expect(page).toHaveURL(new RegExp(`/links\\?q=${NOTE_WORD}$`));
      await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();
      await expect(page.getByText(`1 for “${NOTE_WORD}”`)).toBeVisible();
      const cards = page.locator('ui-card');
      await expect(cards).toHaveCount(1);
      await expect(cards.first()).toContainText('Angular overview');
      await expect(page.getByRole('option')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // Esc clears the field and the feed is all links again.
      await field(page).press('Escape');
      await expect(field(page)).toHaveValue('');
      await expect(page).toHaveURL('/links');
      await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    });

    test('the empty field opens Recent searches under it, exactly as wide, also after a resize', async ({
      page,
    }) => {
      await page.goto('/links');
      await searchOnce(page, 'pasta');
      await field(page).click();
      await expect(recent(page).getByRole('option')).toHaveText(['pasta']);
      await expect(field(page)).toHaveAttribute('aria-expanded', 'true');
      const edges = async () => {
        const host = await page.locator('app-header-search ui-command-list').boundingBox();
        const panel = await page.locator('.ui-command-list__panel').boundingBox();
        return { host, panel };
      };
      const { host, panel } = await edges();
      expect(panel?.y ?? 0).toBeGreaterThanOrEqual((host?.y ?? 0) + (host?.height ?? 0));
      expect(panel?.height ?? 0).toBeLessThanOrEqual(WIDE.height * 0.6 + 1);

      await page.setViewportSize({ width: 1300, height: WIDE.height });
      await expect
        .poll(async () => {
          const now = await edges();
          return (
            [now.panel?.x ?? 0, now.panel?.width ?? 0].map((n) => Math.round(n)).join() ===
            [now.host?.x ?? 0, now.host?.width ?? 0].map((n) => Math.round(n)).join()
          );
        })
        .toBe(true);
      expect((await edges()).host?.width ?? 0).toBeGreaterThan(300);
    });

    test('a recent search runs again from the panel', async ({ page }) => {
      await page.goto('/links');
      await searchOnce(page, 'pasta');
      await field(page).click();
      await recent(page).getByRole('option', { name: 'pasta' }).click();

      await expect(field(page)).toHaveValue('pasta');
      await expect(page).toHaveURL(/[?&]q=pasta/);
      await expect(page.locator('ui-card').first()).toContainText(PASTA_TITLE);
    });

    test('Enter moves to the first card, its words marked; Enter there opens it beside the feed', async ({
      page,
    }) => {
      await page.goto('/links');
      await field(page).fill('pasta');
      const card = page.locator('ui-card');
      await expect(card).toHaveCount(1);
      await expect(card.first().locator('mark').first()).toHaveText(/pasta/i);
      await field(page).press('Enter');
      const link = card.first().locator('a.ui-card__link');
      await expect(link).toBeFocused();

      // From 80em a card opens in the preview split (Settings › Library › Clicking a link).
      await link.press('Enter');
      await expect(page).toHaveURL(/[?&]preview=/);
      await expect(page.getByRole('region', { name: `Preview: ${PASTA_TITLE}` })).toBeVisible();
      await expect(field(page)).toHaveValue('pasta');
    });
  });

  test.describe('from 64em to 80em (1180 x 800)', () => {
    test.use({ viewport: NARROW_DESKTOP });

    test('the header has the same field (no Search button) and Ctrl+K focuses it', async ({
      page,
    }) => {
      await page.goto('/links');
      await expect(page.locator('ui-card').first()).toBeVisible();
      await expect(page.getByRole('banner').getByRole('button', { name: /^Search$/ })).toHaveCount(
        0,
      );
      await page.keyboard.press('Control+k');
      await expect(field(page)).toBeFocused();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
  });
});

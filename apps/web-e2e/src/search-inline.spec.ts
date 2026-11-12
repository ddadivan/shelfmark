import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { SEARCH_BUTTON, SEARCH_FIELD_NAME } from './support/search-button';

// Mirrors the contract mock links (libs/shared/contracts/src/testing).
const PASTA_TITLE = 'Simple pasta';
const NOTE_WORD = 'signals';

const WIDE = { width: 1440, height: 900 } as const;
const NARROW_DESKTOP = { width: 1180, height: 800 } as const;

// The header search (#329): a field with a results panel from 80em, a "Search" button that opens
// the dialog from 64em to 80em. Tablet and phone keep the mobile shell (mobile.spec.ts).
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

  test.describe('from 80em (1440 x 900)', () => {
    test.use({ viewport: WIDE });

    test('the header has a real field and no Search button', async ({ page }) => {
      await page.goto('/links');

      await expect(field(page)).toBeVisible();
      await expect(field(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('button', { name: SEARCH_BUTTON })).toHaveCount(0);
    });

    test('typing opens a panel under the field, sized to the field and 60% of the height at most', async ({
      page,
    }) => {
      await page.goto('/links');
      await field(page).fill(NOTE_WORD);

      const option = page.getByRole('option', { name: /Angular overview/ });
      await expect(option).toBeVisible();
      await expect(field(page)).toHaveAttribute('aria-expanded', 'true');
      const listbox = page.getByRole('listbox', { name: 'Search results' });
      await expect(field(page)).toHaveAttribute(
        'aria-controls',
        (await listbox.getAttribute('id')) ?? '',
      );
      await expect(listbox).not.toHaveAttribute('aria-busy', 'true');

      const panel = page.locator('.ui-command-list__panel');
      const fieldBox = await field(page).boundingBox();
      const panelBox = await panel.boundingBox();
      expect(fieldBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(panelBox?.y ?? 0).toBeGreaterThanOrEqual((fieldBox?.y ?? 0) + (fieldBox?.height ?? 0));
      expect(panelBox?.width ?? 0).toBeGreaterThanOrEqual((fieldBox?.width ?? 0) - 1);
      expect(panelBox?.height ?? 0).toBeLessThanOrEqual(WIDE.height * 0.6 + 1);
      // The dialog is not involved.
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    test('the results scroll inside the panel and the panel stays within 60% of the height', async ({
      page,
    }) => {
      await page.setViewportSize({ width: WIDE.width, height: 480 });
      await page.goto('/links');
      await field(page).fill('article');
      const list = page.getByRole('listbox', { name: 'Search results' });
      await expect(list.getByRole('option').first()).toBeVisible();

      expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      const panelBox = await page.locator('.ui-command-list__panel').boundingBox();
      expect(panelBox?.height ?? 0).toBeLessThanOrEqual(480 * 0.6 + 1);
    });

    test('moves with the arrows and opens a link in a new tab with Enter', async ({
      page,
      context,
    }) => {
      await page.goto('/links');
      await field(page).fill('pasta');
      await expect(page.getByRole('option', { name: new RegExp(PASTA_TITLE) })).toBeVisible();
      await field(page).press('ArrowDown');
      await field(page).press('ArrowUp');
      const opened = context.waitForEvent('page');
      await field(page).press('Enter');

      const popup = await opened;
      await popup.waitForURL(/example\.com\/recipes\/pasta/);
      await expect(page.getByRole('option')).toHaveCount(0);
      await expect(field(page)).toHaveValue('pasta');
    });

    test('Esc closes the panel and keeps the text, a second Esc clears it', async ({ page }) => {
      await page.goto('/links');
      await field(page).fill('pasta');
      await expect(page.getByRole('option').first()).toBeVisible();

      await field(page).press('Escape');
      await expect(page.getByRole('option')).toHaveCount(0);
      await expect(field(page)).toHaveValue('pasta');
      await expect(field(page)).toBeFocused();

      await field(page).press('Escape');
      await expect(field(page)).toHaveValue('');
    });

    test('ArrowDown reopens the closed panel when there is text', async ({ page }) => {
      await page.goto('/links');
      await field(page).fill('pasta');
      await expect(page.getByRole('option').first()).toBeVisible();
      await field(page).press('Escape');
      await expect(page.getByRole('option')).toHaveCount(0);

      await field(page).press('ArrowDown');

      await expect(page.getByRole('option').first()).toBeVisible();
    });

    test('a press outside closes the panel and keeps the text', async ({ page }) => {
      await page.goto('/links');
      await field(page).fill('pasta');
      await expect(page.getByRole('option').first()).toBeVisible();

      // The empty part of the header bar (the panel covers the page below the field).
      await page.getByRole('banner').click({ position: { x: 760, y: 24 } });

      await expect(page.getByRole('option')).toHaveCount(0);
      await expect(field(page)).toHaveValue('pasta');
    });

    test('Ctrl+K focuses the field instead of opening the dialog', async ({ page }) => {
      await page.goto('/links');
      await expect(page.locator('app-link-card').first()).toBeVisible();

      await page.keyboard.press('Control+k');

      await expect(field(page)).toBeFocused();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    test('shows the empty state in the panel for a query without results', async ({ page }) => {
      await page.goto('/links');
      await field(page).fill('zzzzqq');

      await expect(
        page.locator('.ui-command-list__panel').getByText('Nothing found for “zzzzqq”'),
      ).toBeVisible();
    });
  });

  test.describe('from 64em to 80em (1180 x 800)', () => {
    test.use({ viewport: NARROW_DESKTOP });

    test('the header has a Search button with the shortcut hint, and no field', async ({
      page,
    }) => {
      await page.goto('/links');

      const button = page.getByRole('button', { name: SEARCH_BUTTON });
      await expect(button).toBeVisible();
      await expect(button).toContainText(/⌘K|Ctrl K/);
      await expect(page.getByRole('banner').getByRole('combobox')).toHaveCount(0);
    });

    test('the button opens the search dialog', async ({ page }) => {
      await page.goto('/links');
      await page.getByRole('button', { name: SEARCH_BUTTON }).click();

      await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
      await expect(field(page)).toBeFocused();
    });

    test('Ctrl+K opens the search dialog', async ({ page }) => {
      await page.goto('/links');
      await expect(page.locator('app-link-card').first()).toBeVisible();

      await page.keyboard.press('Control+k');

      await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
    });

    test('growing to 80em swaps the button for the field', async ({ page }) => {
      await page.goto('/links');
      await expect(page.getByRole('button', { name: SEARCH_BUTTON })).toBeVisible();

      await page.setViewportSize(WIDE);

      await expect(field(page)).toBeVisible();
      await expect(page.getByRole('button', { name: SEARCH_BUTTON })).toHaveCount(0);
    });
  });
});

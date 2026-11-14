import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { E2E_TAG } from './models/e2e-tag.const';

const SHARED_TEXT = '/share?text=Look%20https%3A%2F%2Fexample.com%2Fa';
const SAVED_TITLE = 'Page on example.com';

test.describe('share target (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  async function waitForPreview(page: Page) {
    await expect(page.getByRole('heading', { level: 1, name: 'Save to Shelfmark' })).toBeVisible();
    await expect(page.locator('.share__link-title')).toHaveText(SAVED_TITLE);
  }

  test(
    'opens the quick form with the preview and saves the link',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedSession(page);
      await page.goto(SHARED_TEXT);

      await waitForPreview(page);
      await expect(page.getByText('https://example.com/a')).toBeVisible();
      await page.getByLabel('Note').fill('From a chat');
      await page.getByRole('button', { name: 'Save', exact: true }).click();

      await expect(page).toHaveURL(/\/links$/);
      await expect(page.getByText(/Saved to /)).toBeVisible();
      await expect(page.getByRole('heading', { name: SAVED_TITLE }).first()).toBeVisible();
    },
  );

  test('sends a guest to sign-in and back to the share form with its data', async ({ page }) => {
    await page.goto(SHARED_TEXT);

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fshare%3Ftext%3D/);
    const returnUrl = new URL(page.url()).searchParams.get('returnUrl');
    // The router may write `:` unescaped; compare what the page will read after the way back.
    const back = new URL(returnUrl ?? '', page.url());
    expect(back.pathname).toBe('/share');
    expect(back.searchParams.get('text')).toBe('Look https://example.com/a');
  });

  test('fits a 360px phone without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await seedSession(page);
    await page.goto(
      `/share?url=${encodeURIComponent(`https://example.com/${'long-path-segment-'.repeat(12)}`)}`,
    );
    await waitForPreview(page).catch(() => undefined);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeInViewport();

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

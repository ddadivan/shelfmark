import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';

const SHARED_TEXT = '/share?text=Look%20https%3A%2F%2Fexample.com%2Fa';
const SAVED_TITLE = 'Page on example.com';

test.describe('share target (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  async function waitForPreview(page: Page) {
    await expect(page.getByRole('heading', { level: 1, name: 'Save to Shelfmark' })).toBeVisible();
    await expect(page.locator('.share__link-title')).toHaveText(SAVED_TITLE);
  }

  test('opens the quick form with the preview and saves the link', async ({ page }) => {
    await seedSession(page);
    await page.goto(SHARED_TEXT);

    await waitForPreview(page);
    await expect(page.getByText('https://example.com/a')).toBeVisible();
    await page.getByLabel('Note').fill('From a chat');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page).toHaveURL(/\/links$/);
    await expect(page.getByText(/Saved to /)).toBeVisible();
    await expect(page.getByRole('heading', { name: SAVED_TITLE }).first()).toBeVisible();
  });

  for (const [name, path] of [
    ['a javascript: URL', '/share?url=javascript%3Aalert(1)'],
    ['a data: URL', '/share?text=data%3Atext%2Fhtml%2C%3Cscript%3Ealert(1)%3C%2Fscript%3E'],
    ['no URL at all', '/share?title=Just%20a%20title'],
  ] as const) {
    test(`shows the error and saves nothing for ${name}`, async ({ page }) => {
      await seedSession(page);
      await page.goto(path);

      await expect(page.getByRole('heading', { level: 1, name: 'Nothing to save' })).toBeVisible();
      await expect(page.getByText('so nothing was saved')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);

      await page.getByRole('button', { name: 'Go to my links' }).click();
      await expect(page).toHaveURL(/\/links$/);
      await expect(page.getByText(SAVED_TITLE)).toHaveCount(0);
    });
  }

  test('sends a guest to sign-in and back to the share form with its data', async ({ page }) => {
    await page.goto(SHARED_TEXT);

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fshare%3Ftext%3D/);
    const returnUrl = new URL(page.url()).searchParams.get('returnUrl');
    // The router may write `:` unescaped; compare what the page will read after the way back.
    const back = new URL(returnUrl ?? '', page.url());
    expect(back.pathname).toBe('/share');
    expect(back.searchParams.get('text')).toBe('Look https://example.com/a');
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test(`has no axe violations (${colorScheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await seedSession(page);
      await page.goto(SHARED_TEXT);
      await waitForPreview(page);
      await expectNoBlockingViolations(page, testInfo);
    });

    test(`has no axe violations in the error state (${colorScheme})`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await seedSession(page);
      await page.goto('/share');
      await expect(page.getByRole('heading', { level: 1, name: 'Nothing to save' })).toBeVisible();
      await expectNoBlockingViolations(page, testInfo);
    });
  }

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

import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import { expect, test } from './support/test';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { openFeed } from './support/a11y-flows';
import {
  enablePublicLink,
  openShareDialog,
  readShares,
  seedShares,
} from './support/public-collection';

/**
 * A guest in a fresh browser context: same device as the project, no session, and the owner's
 * mock public links copied in (the mock library is the same everywhere, so this is the server).
 */
async function asGuest(
  browser: Browser,
  testInfo: TestInfo,
  shares: string,
): Promise<{ context: BrowserContext; guest: Page }> {
  const { baseURL, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
    testInfo.project.use;
  const context = await browser.newContext({
    baseURL,
    viewport,
    userAgent,
    deviceScaleFactor,
    isMobile,
    hasTouch,
  });
  const guest = await context.newPage();
  await guest.route('**/api/monitoring/config', (route) =>
    route.fulfill({ json: { dsn: null, environment: 'test', release: null } }),
  );
  await seedShares(guest, shares);
  return { context, guest };
}

// The note of the Angular overview fixture (MOCK_LINKS[0]), the one link with a note in Reading.
const NOTE = 'Start here for signals.';

test.describe('public collections (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('share a folder, copy the link and open it as a guest; notes and reset', async ({
    page,
    browser,
    context,
  }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openFeed(page);

    const dialog = await openShareDialog(page, MOCK_FIXTURE.readingName);
    const url = await enablePublicLink(dialog);
    await expect(dialog.getByRole('switch', { name: 'Show my notes' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    await dialog.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied')).toBeVisible();
    expect(await page.evaluate('navigator.clipboard.readText()')).toBe(url);

    // A guest opens the link: read-only, no notes, noindex.
    const path = new URL(url).pathname;
    const first = await asGuest(browser, testInfo, await readShares(page));
    await first.guest.goto(path);
    await expect(
      first.guest.getByRole('heading', { level: 1, name: MOCK_FIXTURE.readingName }),
    ).toBeVisible();
    await expect(first.guest.getByText('Shared by E2E')).toBeVisible();
    await expect(first.guest.locator('ui-card').first()).toBeVisible();
    await expect(first.guest.getByRole('button', { name: /^Actions for / })).toHaveCount(0);
    await expect(first.guest.getByRole('button', { name: /^Favorite / })).toHaveCount(0);
    await expect(first.guest.getByText(NOTE)).toHaveCount(0);
    await expect(first.guest.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(first.guest.getByRole('link', { name: 'Start your shelf' })).toBeVisible();
    await expect(first.guest.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await first.context.close();

    // Notes on: the guest sees why each link was saved.
    await dialog.getByRole('switch', { name: 'Show my notes' }).click();
    await expect(dialog.getByRole('button', { name: 'Reset' })).toBeEnabled();
    const second = await asGuest(browser, testInfo, await readShares(page));
    await second.guest.goto(path);
    await expect(second.guest.getByText(NOTE)).toBeVisible();
    await second.context.close();

    // Reset: the old link stops working, the new one works.
    await dialog.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset link' }).click();
    const field = dialog.getByLabel('Public link address');
    await expect(field).not.toHaveValue(url);
    const fresh = new URL(await field.inputValue()).pathname;
    const third = await asGuest(browser, testInfo, await readShares(page));
    await third.guest.goto(path);
    await expect(
      third.guest.getByRole('heading', { level: 1, name: "This collection isn't available" }),
    ).toBeVisible();
    await third.guest.goto(fresh);
    await expect(
      third.guest.getByRole('heading', { level: 1, name: MOCK_FIXTURE.readingName }),
    ).toBeVisible();
    await third.context.close();

    // Turned off: the link is gone.
    await dialog.getByRole('switch', { name: 'Public link' }).click();
    await expect(field).toHaveCount(0);
    const fourth = await asGuest(browser, testInfo, await readShares(page));
    await fourth.guest.goto(fresh);
    await expect(
      fourth.guest.getByRole('heading', { level: 1, name: "This collection isn't available" }),
    ).toBeVisible();
    await fourth.context.close();
  });

  test('a signed-in person sees the way back to their shelf and can filter', async ({ page }) => {
    await openFeed(page);
    const dialog = await openShareDialog(page, MOCK_FIXTURE.readingName);
    const url = await enablePublicLink(dialog);
    await page.goto(new URL(url).pathname);

    await expect(page.getByRole('link', { name: 'Back to my shelf' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start your shelf' })).toHaveCount(0);
    const chips = page.getByRole('group', { name: 'Subfolders' });
    await expect(chips.getByRole('button', { name: /^All/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await chips.getByRole('button', { name: /^Angular/ }).click();
    await expect(chips.getByRole('button', { name: /^Angular/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('ui-card').first()).toBeVisible();
  });
});

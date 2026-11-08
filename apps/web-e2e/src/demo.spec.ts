import { expect, test } from '@playwright/test';
import { DEMO_LIMIT } from '@shelfmark/contracts';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { demoUser, openAccountMenu, seedSession } from './support/mock-session';

const BANNER_TITLE = "You're in a demo.";
const BANNER_ACTION = 'Sign in with your own account';

test.describe('demo sign-in (mock auth)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock auth API');

  test('"Open the demo" on the landing opens the library with the banner', async ({ page }) => {
    await page.goto('/');
    const demoLink = page
      .getByRole('region', { name: 'Empty your Saved Messages.' })
      .getByRole('link', { name: 'Open the demo' });
    await demoLink.scrollIntoViewIfNeeded();
    await demoLink.click();

    await expect(page).toHaveURL(/\/links$/);
    // A fresh demo user gets the welcome dialog; skip it so the page behind is reachable.
    await page.getByRole('dialog').getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    const banner = page.getByRole('status').filter({ hasText: BANNER_TITLE });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(`resets in ${DEMO_LIMIT.SessionHours} hours`);
  });

  for (const [failure, reason, text] of [
    ['rate-limited', 'demo-limit', 'Too many demos'],
    ['unavailable', 'demo-unavailable', 'The demo is full'],
  ]) {
    // The e2e build uses the mock auth API, which fails the demo on this localStorage key.
    test(`/demo explains a ${failure} demo on the sign-in screen`, async ({ page }) => {
      await page.addInitScript(
        ([key, value]) => localStorage.setItem(key, value),
        ['sm-mock-demo-failure', failure],
      );
      await page.goto('/demo');

      await expect(page).toHaveURL(new RegExp(`/sign-in\\?reason=${reason}$`));
      await expect(page.getByText(text)).toBeVisible();
    });
  }

  test('the sign-in demo button opens the library with the banner', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('button', { name: 'Open the demo' }).click();

    await expect(page).toHaveURL(/\/links$/);
    await expect(page.getByText(BANNER_TITLE)).toBeVisible();
  });

  test('/demo for a signed-in user goes to the library', async ({ page }) => {
    await seedSession(page);
    await page.goto('/demo');

    await expect(page).toHaveURL(/\/links$/);
    await expect(page.getByText(BANNER_TITLE)).toHaveCount(0);
  });

  test('a regular user sees no banner', async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');

    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    await expect(page.getByText(BANNER_TITLE)).toHaveCount(0);
  });

  test('the banner action signs out and goes to sign-in', async ({ page }) => {
    await seedSession(page, demoUser(5));
    await page.goto('/links');

    await page.getByRole('button', { name: BANNER_ACTION }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto('/links');
    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Flinks$/);
  });

  test('an expired demo session is dropped with the demo-ended notice', async ({ page }) => {
    await seedSession(page, demoUser(-1));
    await page.goto('/links');

    await expect(page).toHaveURL(/\/sign-in\?reason=demo-expired$/);
    await expect(page.getByText('The demo has ended.')).toBeVisible();
  });

  test('the demo user can sign out from the account menu', async ({ page }) => {
    await seedSession(page, demoUser(5));
    await page.goto('/links');
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('the library with the banner fits a 360px phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await seedSession(page, demoUser(23));
    await page.goto('/links');

    await expect(page.getByText(BANNER_TITLE)).toBeVisible();
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      test('the library with the demo banner has no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        await seedSession(page, demoUser(23));
        await page.goto('/links');
        await expect(page.getByText(BANNER_TITLE)).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo, {
          disabledRules: ['label-content-name-mismatch'],
        });
      });
    });
  }
});

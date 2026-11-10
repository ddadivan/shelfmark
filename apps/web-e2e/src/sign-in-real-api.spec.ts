import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { AUTH_PROVIDER } from '@shelfmark/contracts';
import { isPhone } from './support/sidebar';
import { MOCK_USER, signOutFromUi } from './support/mock-session';

// Same value as REAL_AUTH_API_STORAGE_KEY in apps/web/src/app/core/auth/models/real-auth-api-storage-key.const.ts.
const REAL_AUTH_API_KEY = 'sm-real-auth-api';
const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=e2e';
// The API always sends onboardingCompletedAt; a missing one reads as null and opens the welcome tour.
const SESSION = {
  user: { ...MOCK_USER, onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
};

/** Binds the real Better Auth client (instead of the mock) and answers get-session. */
async function useRealAuthApi(page: Page, session: typeof SESSION | null): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, '1'), REAL_AUTH_API_KEY);
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(session) }),
  );
}

test.describe('sign-in flow (real auth client, routed API)', () => {
  // The production build registers the PWA service worker, and page.route never sees the
  // requests it makes, so the routed auth API would be bypassed.
  test.use({ serviceWorkers: 'block' });

  test('starts the OAuth redirect with same-origin callback URLs', async ({ page }) => {
    await useRealAuthApi(page, null);
    let body: unknown;
    await page.route('**/api/auth/sign-in/social', (route) => {
      body = route.request().postDataJSON();
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ url: GOOGLE_AUTHORIZE, redirect: true }),
      });
    });
    // No real provider traffic from the test.
    await page.route('https://accounts.google.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>provider</title>' }),
    );

    await page.goto('/sign-in?returnUrl=%2Flinks');
    await page.getByRole('button', { name: 'Continue with Google' }).click();

    await expect(page).toHaveURL(GOOGLE_AUTHORIZE);
    expect(body).toMatchObject({
      provider: AUTH_PROVIDER.Google,
      callbackURL: expect.stringMatching(/\/links$/),
      errorCallbackURL: expect.stringContaining('/sign-in?returnUrl=%2Flinks'),
    });
  });

  test('never follows a sign-in response that points at another site', async ({ page }) => {
    await useRealAuthApi(page, null);
    await page.route('**/api/auth/sign-in/social', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://evil.example/phish', redirect: true }),
      }),
    );

    await page.goto('/sign-in');
    await page.getByRole('button', { name: 'Continue with GitHub' }).click();

    await expect(page.getByText('We could not sign you in. Try again.')).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('explains a GitHub account without a verified email', async ({ page }) => {
    await useRealAuthApi(page, null);

    await page.goto('/sign-in?error=email_not_found');

    await expect(page.getByText(/no verified email/)).toBeVisible();
  });

  test('a failed sign-out keeps the user signed in and shows an error', async ({ page }) => {
    await useRealAuthApi(page, SESSION);
    await page.route('**/api/auth/sign-out', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/links');
    await signOutFromUi(page);

    await expect(page.getByText("Couldn't sign you out")).toBeVisible();
    // A phone signs out from the You tab, which is Settings.
    await expect(page).toHaveURL(isPhone(page) ? /\/settings$/ : /\/links$/);
  });

  test('a confirmed sign-out returns to sign-in', async ({ page }) => {
    await useRealAuthApi(page, SESSION);
    await page.route('**/api/auth/sign-out', (route) =>
      route.fulfill({ contentType: 'application/json', body: '{"success":true}' }),
    );

    await page.goto('/links');
    await signOutFromUi(page);

    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

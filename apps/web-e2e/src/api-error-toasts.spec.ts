import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { MOCK_USER } from './support/mock-session';

// Same value as REAL_AUTH_API_STORAGE_KEY in apps/web/src/app/core/auth/models/real-auth-api-storage-key.const.ts.
const REAL_AUTH_API_KEY = 'sm-real-auth-api';
const SESSION = {
  user: { ...MOCK_USER, onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
};

/** Real auth client and real data APIs, with every `/api` data request answered with `status`. */
async function failApi(page: Page, status: number): Promise<{ failed: () => number }> {
  let failed = 0;
  page.on('response', (response) => {
    const { pathname } = new URL(response.url());
    if (
      response.status() === status &&
      pathname.startsWith('/api/') &&
      !pathname.startsWith('/api/auth/')
    ) {
      failed += 1;
    }
  });
  await page.addInitScript((key) => localStorage.setItem(key, '1'), REAL_AUTH_API_KEY);
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(SESSION) }),
  );
  await page.route(
    (url) =>
      url.pathname.startsWith('/api/') &&
      !url.pathname.startsWith('/api/auth/') &&
      !url.pathname.startsWith('/api/monitoring/'),
    (route) => route.fulfill({ status, contentType: 'application/json', body: '{}' }),
  );
  return { failed: () => failed };
}

/** Expects `text` once on screen although several requests failed (the dedupe, not a lucky timing). */
async function expectSingleToast(page: Page, api: { failed: () => number }, text: string) {
  const toast = page.getByText(text);
  await expect(toast).toHaveCount(1);
  await expect.poll(api.failed).toBeGreaterThan(1);
  await page.waitForLoadState('networkidle');
  await expect(toast).toHaveCount(1);
}

test.describe('API error toasts (real APIs, routed failures)', () => {
  // The production build registers the PWA service worker, and page.route never sees the
  // requests it makes.
  test.use({ serviceWorkers: 'block' });

  test('a 429 shows the rate-limit toast once', async ({ page }) => {
    const api = await failApi(page, 429);

    await page.goto('/links');

    await expectSingleToast(page, api, 'Too many requests. Try again in a moment.');
  });

  test('a 500 shows the server-error toast once', async ({ page }) => {
    const api = await failApi(page, 500);

    await page.goto('/links');

    await expectSingleToast(page, api, 'Something went wrong on our side. Try again.');
  });
});

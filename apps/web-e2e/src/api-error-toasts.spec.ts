import { expect, Page, test } from '@playwright/test';
import { MOCK_USER } from './support/mock-session';

// Same value as REAL_AUTH_API_STORAGE_KEY in apps/web/src/app/core/auth/models/real-auth-api-storage-key.const.ts.
const REAL_AUTH_API_KEY = 'sm-real-auth-api';
const SESSION = {
  user: { ...MOCK_USER, onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
};

/** Real auth client and real data APIs, with every `/api` data request answered with `status`. */
async function failApi(page: Page, status: number): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, '1'), REAL_AUTH_API_KEY);
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(SESSION) }),
  );
  await page.route(
    (url) => url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/'),
    (route) => route.fulfill({ status, contentType: 'application/json', body: '{}' }),
  );
}

test.describe('API error toasts (real APIs, routed failures)', () => {
  // The production build registers the PWA service worker, and page.route never sees the
  // requests it makes.
  test.use({ serviceWorkers: 'block' });

  test('a 429 shows the rate-limit toast once', async ({ page }) => {
    await failApi(page, 429);

    await page.goto('/links');

    await expect(page.getByText('Too many requests. Try again in a moment.')).toHaveCount(1);
  });

  test('a 500 shows the server-error toast once', async ({ page }) => {
    await failApi(page, 500);

    await page.goto('/links');

    await expect(page.getByText('Something went wrong on our side. Try again.')).toHaveCount(1);
  });
});

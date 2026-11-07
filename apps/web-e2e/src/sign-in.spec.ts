import { expect, Page, test } from '@playwright/test';

// Same value as MOCK_SESSION_STORAGE_KEY in apps/web/src/app/core/auth/models/mock-session-storage-key.const.ts.
const MOCK_SESSION_KEY = 'sm-mock-session';
const SEEDED_FLAG = 'seeded';
const GITHUB_BUTTON = 'Continue with GitHub';
const SIGN_OUT_BUTTON = 'Sign out';
const MOCK_USER = {
  id: 'e2e',
  name: 'E2E User',
  email: 'e2e@example.com',
  image: null,
  isDemo: false,
};

async function seedSession(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, user, flag]) => {
      // Seed once: sign-out clears the key and a reload must not bring the session back.
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        localStorage.setItem(key, user);
      }
    },
    [MOCK_SESSION_KEY, JSON.stringify(MOCK_USER), SEEDED_FLAG],
  );
}

test.describe('sign-in flow (mock auth)', () => {
  test('a guest on a protected URL lands on sign-in and returns after signing in', async ({
    page,
  }) => {
    await page.goto('/links');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Flinks$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'All your links on one shelf' }),
    ).toBeVisible();

    await page.getByRole('button', { name: GITHUB_BUTTON }).click();

    await expect(page).toHaveURL(/\/links$/);
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
  });

  test('sign-out clears the session and returns to sign-in', async ({ page }) => {
    await seedSession(page);
    await page.goto('/');

    await expect(page).toHaveURL(/\/links$/);
    // The name is hidden on a phone (the avatar stays), so only check that it is rendered.
    await expect(page.getByText(MOCK_USER.name)).toHaveCount(1);

    await page.getByRole('button', { name: SIGN_OUT_BUTTON }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goto('/links');
    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Flinks$/);
  });

  test('a signed-in user is kept away from sign-in', async ({ page }) => {
    await seedSession(page);
    await page.goto('/sign-in');

    await expect(page).toHaveURL(/\/links$/);
  });

  test('the sign-in page fits a 360px phone and shows the expiry reason', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/sign-in?reason=session-expired');

    await expect(page.getByText('Your session has expired. Sign in again.')).toBeVisible();
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

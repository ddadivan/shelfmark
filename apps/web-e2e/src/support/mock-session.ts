import { expect, Page } from '@playwright/test';

// Same value as MOCK_SESSION_STORAGE_KEY in apps/web/src/app/core/auth/models/mock-session-storage-key.const.ts.
const MOCK_SESSION_KEY = 'sm-mock-session';
const SEEDED_FLAG = 'seeded';

export const MOCK_USER = {
  id: 'e2e',
  name: 'E2E User',
  email: 'e2e@example.com',
  image: null,
  isDemo: false,
};

/** Signs the mock auth API in before the app starts. */
export async function seedSession(
  page: Page,
  user: Record<string, unknown> = MOCK_USER,
): Promise<void> {
  await page.addInitScript(
    ([key, user, flag]) => {
      // Seed once: sign-out clears the key and a reload must not bring the session back.
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        localStorage.setItem(key, user);
      }
    },
    [MOCK_SESSION_KEY, JSON.stringify(user), SEEDED_FLAG],
  );
}

/** Opens the account menu in the app shell header. */
export async function openAccountMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Account menu' }).click();
}

/** A user who has not seen the welcome tour yet (the mock sign-in buttons create one too). */
export const NEW_USER = { ...MOCK_USER, id: 'e2e-new', onboardingCompletedAt: null };

/** Skips the welcome dialog that a first sign-in opens, and waits until it is gone. */
export async function dismissOnboarding(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'All your links in one place' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

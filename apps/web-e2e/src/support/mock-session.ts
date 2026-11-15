import { expect, Page } from '@playwright/test';
import { isCompact, tabBar } from './sidebar';

// Same value as MOCK_SESSION_STORAGE_KEY in apps/web/src/app/core/auth/models/mock-session-storage-key.const.ts.
const MOCK_SESSION_KEY = 'sm-mock-session';
const MS_PER_HOUR = 3_600_000;
const SEEDED_FLAG = 'seeded';
// Same value as MOCK_WHATS_NEW_STORAGE_KEY (apps/web/src/app/features/settings/models).
const MOCK_WHATS_NEW_KEY = 'sm-mock-whats-new-seen';
/** Newer than any release: the mock account has seen every "What's new" (#424). */
const SEEN_EVERYTHING = '999.999.999';

export const MOCK_USER = {
  id: 'e2e',
  name: 'E2E User',
  email: 'e2e@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
};

/** A demo user whose sandbox ends `hours` from now. */
export function demoUser(hours: number) {
  return {
    ...MOCK_USER,
    id: 'e2e-demo',
    name: 'Demo user',
    isDemo: true,
    demoExpiresAt: new Date(Date.now() + hours * MS_PER_HOUR).toISOString(),
  };
}

/**
 * Signs the mock auth API in before the app starts (as `user`, a regular user by default), with
 * every "What's new" seen (`seedWhatsNewSeen` after it stores another release).
 */
export async function seedSession(
  page: Page,
  user: Record<string, unknown> = MOCK_USER,
): Promise<void> {
  await page.addInitScript(
    ([key, user, flag, whatsNewKey, seen]) => {
      // Seed once: sign-out clears the key and a reload must not bring the session back.
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        localStorage.setItem(key, user);
        // The seeded user counts as onboarded (a missing onboardingCompletedAt is legacy), so it
        // would get the "What's new" dialog: mark every release seen unless a spec stored one.
        if (localStorage.getItem(whatsNewKey) === null) {
          localStorage.setItem(whatsNewKey, seen);
        }
      }
    },
    [MOCK_SESSION_KEY, JSON.stringify(user), SEEDED_FLAG, MOCK_WHATS_NEW_KEY, SEEN_EVERYTHING],
  );
}

/** Opens the account menu in the app shell header (tablet and desktop; a phone has the You tab). */
export async function openAccountMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Account menu' }).click();
}

/** Opens Settings: the "Settings" item of the account menu, or the You tab on a phone. */
export async function openSettingsPage(page: Page): Promise<void> {
  if (isCompact(page)) {
    await tabBar(page).getByRole('link', { name: 'You' }).click();
  } else {
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Settings' }).click();
  }
}

/**
 * Opens one section of the settings by its name ("Account", "Appearance", "Export", ...): the row
 * in the settings nav, or in the You list on a phone (where the account is the card on top).
 */
export async function openSettingsSection(page: Page, section: string): Promise<void> {
  await openSettingsPage(page);
  if (isCompact(page)) {
    const name = section === 'Account' ? /^Account/ : section;
    await page.getByRole('main').getByRole('link', { name }).click();
  } else {
    await page
      .getByRole('navigation', { name: 'Settings' })
      .getByRole('link', { name: section })
      .click();
  }
}

/** Signs out: the "Sign out" item of the account menu, or the button on the You tab on a phone. */
export async function signOutFromUi(page: Page): Promise<void> {
  if (isCompact(page)) {
    await tabBar(page).getByRole('link', { name: 'You' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
  } else {
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
  }
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

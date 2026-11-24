import { expect, Page } from '@playwright/test';
import { isCompact } from './sidebar';

// Same value as MOCK_SESSION_STORAGE_KEY in apps/web/src/app/core/auth/models/mock-session-storage-key.const.ts.
const MOCK_SESSION_KEY = 'sm-mock-session';
const MS_PER_HOUR = 3_600_000;
const SEEDED_FLAG = 'seeded';
// Same value as MOCK_WHATS_NEW_STORAGE_KEY (apps/web/src/app/features/settings/models).
const MOCK_WHATS_NEW_KEY = 'sm-mock-whats-new-seen';
/** Newer than any release: the mock account has seen every "What's new" (#424). */
const SEEN_EVERYTHING = '999.999.999';
// Same value as MOCK_AI_ANNOUNCEMENT_STORAGE_KEY (apps/web/src/app/features/ai/mock/models): the
// one-time AI announcement (#507) would open over every spec, so the seeded account has seen it.
const MOCK_AI_ANNOUNCEMENT_KEY = 'sm-mock-ai-announcement';

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
    ([key, user, flag, whatsNewKey, seen, announcementKey]) => {
      // Seed once: sign-out clears the key and a reload must not bring the session back.
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        localStorage.setItem(key, user);
        // The seeded user counts as onboarded (a missing onboardingCompletedAt is legacy), so it
        // would get the "What's new" dialog: mark every release seen unless a spec stored one.
        if (localStorage.getItem(whatsNewKey) === null) {
          localStorage.setItem(whatsNewKey, seen);
        }
        if (localStorage.getItem(announcementKey) === null) {
          localStorage.setItem(announcementKey, '1');
        }
      }
    },
    [
      MOCK_SESSION_KEY,
      JSON.stringify(user),
      SEEDED_FLAG,
      MOCK_WHATS_NEW_KEY,
      SEEN_EVERYTHING,
      MOCK_AI_ANNOUNCEMENT_KEY,
    ],
  );
}

/**
 * Opens the account menu: the avatar in the header from 64em, in the top bar of the mobile shell
 * (a bottom sheet there; Shelf block 1 has no You tab).
 */
export async function openAccountMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Account menu' }).click();
}

/**
 * Opens Settings: the "Settings" item of the account menu (the You list in the mobile shell). A
 * settings page of the mobile shell has no top bar: its "Back to You" link leads there instead.
 */
export async function openSettingsPage(page: Page): Promise<void> {
  const path = new URL(page.url()).pathname;
  if (isCompact(page) && path.startsWith('/settings')) {
    if (path !== '/settings') {
      await page.getByRole('link', { name: 'Back to You' }).click();
    }
    return;
  }
  await openAccountMenu(page);
  await page.getByRole('menuitem', { name: 'Settings' }).click();
}

/** Opens the You list of the mobile shell (`/settings` below 64em) through the account menu. */
export async function openYouPage(page: Page): Promise<void> {
  await openSettingsPage(page);
  await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible();
}

/**
 * Opens one section of the settings by its name ("Account", "Appearance", "Export", ...): the row
 * in the settings nav, or in the You list in the mobile shell (where the account is the card on top).
 */
export async function openSettingsSection(page: Page, section: string): Promise<void> {
  await openSettingsPage(page);
  if (isCompact(page)) {
    const name = section === 'Account' ? /^Account/ : section;
    await page.getByRole('main').getByRole('link', { name }).last().click();
  } else {
    await page
      .getByRole('navigation', { name: 'Settings' })
      .getByRole('link', { name: section })
      .click();
  }
}

/** Signs out: the "Sign out" item of the account menu. */
export async function signOutFromUi(page: Page): Promise<void> {
  await openAccountMenu(page);
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
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

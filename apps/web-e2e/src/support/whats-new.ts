import type { Page } from '@playwright/test';

// Same value as MOCK_WHATS_NEW_STORAGE_KEY in apps/web/src/app/features/settings/models.
export const MOCK_WHATS_NEW_KEY = 'sm-mock-whats-new-seen';
/** Newer than any release: the mock account has seen every "What's new". */
const SEEN_EVERYTHING = '999.999.999';

/**
 * Stores the last seen "What's new" release on the mock account before the app starts (#424);
 * `null` leaves none stored (a new account, or one from before #424). Call it after `seedSession`,
 * which marks every release seen. Specs that sign in through routed auth and test something else
 * call it with the default, since an onboarded user with nothing stored gets the dialog.
 */
export async function seedWhatsNewSeen(
  page: Page,
  release: string | null = SEEN_EVERYTHING,
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      // Once per tab: what the app writes later (opening the dialog) must survive a reload.
      if (!sessionStorage.getItem(`${key}-seeded`)) {
        sessionStorage.setItem(`${key}-seeded`, '1');
        if (value === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, value);
        }
      }
    },
    [MOCK_WHATS_NEW_KEY, release] as const,
  );
}

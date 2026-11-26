import type { Page } from '@playwright/test';

// Same value as MOCK_EXTENSION_BANNER_KEY: the extension banner would take the room of the feed.
const EXTENSION_BANNER_KEY = 'sm-extension-banner-dismissed';
/** How long a toast may still arrive after the screen is ready (the demo's due reminder). */
const TOAST_GRACE_MS = 2500;

/** Before the app starts: nothing a help picture should not show (the extension banner). */
export async function hideBanners(page: Page): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, '1'), EXTENSION_BANNER_KEY);
}

/** Once the screen is ready: closes the toasts (the due reminder) so none covers the picture. */
export async function closeToasts(page: Page): Promise<void> {
  await page.waitForTimeout(TOAST_GRACE_MS);
  const toasts = page.getByRole('status').getByRole('button', { name: 'Dismiss' });
  // A click event, not a pointer click: an open search list can sit over the toast.
  for (let left = 5; left > 0 && (await toasts.count()) > 0; left--) {
    await toasts.first().dispatchEvent('click');
    await page.waitForTimeout(400);
  }
}

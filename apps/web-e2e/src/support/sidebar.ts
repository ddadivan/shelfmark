import { expect, type Page } from '@playwright/test';

/** 40em at the 16px root font size. */
const PHONE_BREAKPOINT_PX = 640;

/**
 * Makes the library sidebar reachable. From the tablet width it is inline and nothing happens;
 * on a phone it opens the drawer (once; a drawer that is still leaving after a navigation is
 * waited out first). Use it after `page.goto` and again after a step that navigates, because
 * the drawer closes on navigation.
 */
export async function openSidebar(page: Page): Promise<void> {
  // The same 40em breakpoint as the app; the page may not have rendered yet, so not a locator check.
  const width = page.viewportSize()?.width ?? Infinity;
  if (width >= PHONE_BREAKPOINT_PX) {
    return;
  }
  const opener = page.getByRole('button', { name: 'Open menu' });
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  await expect(page.locator('.ui-drawer--leave')).toHaveCount(0);
  if ((await drawer.count()) > 0) {
    return;
  }
  await expect(opener).toBeVisible();
  await opener.click();
  await expect(drawer).toBeVisible();
}

/** `page.goto`, then opens the sidebar on a phone. */
export async function gotoWithSidebar(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await openSidebar(page);
}

/**
 * Closes the phone drawer with Esc, for steps on the page itself: while it is open the CDK hides
 * the page from assistive technology, so role queries find nothing there. No-op off the phone.
 */
export async function closeSidebar(page: Page): Promise<void> {
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  if ((await drawer.count()) > 0) {
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
  }
}

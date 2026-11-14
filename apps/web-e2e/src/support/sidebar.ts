import { expect, type Locator, type Page } from '@playwright/test';

/** 40em at the 16px root font size. */
const PHONE_BREAKPOINT_PX = 640;
/** 64em at the 16px root font size: where the sidebar replaces the tab bar (#316). */
const DESKTOP_BREAKPOINT_PX = 1024;

/**
 * Below 40em: small-screen details only (bottom-sheet dialogs, the one Options menu, short labels).
 * The navigation follows `isCompact`.
 */
export function isPhone(page: Page): boolean {
  // The same 40em breakpoint as the app; the page may not have rendered yet, so not a locator check.
  return (page.viewportSize()?.width ?? Infinity) < PHONE_BREAKPOINT_PX;
}

/**
 * Below 64em (phones and the tablet project): the mobile shell, the tab bar replaces the sidebar
 * and the top bar, Library, Tags and You are pages, rows swipe and long press selects.
 */
export function isCompact(page: Page): boolean {
  return (page.viewportSize()?.width ?? Infinity) < DESKTOP_BREAKPOINT_PX;
}

/** The floating tab bar of the phone. */
export function tabBar(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Main' });
}

/**
 * Makes the folder tree reachable. From the tablet width the sidebar is inline and nothing
 * happens; on a phone it opens the Library tab (a page, not an overlay). Use it after `page.goto`
 * and again after a step that navigates away.
 */
export async function openSidebar(page: Page): Promise<void> {
  if (!isCompact(page)) {
    return;
  }
  if (!/\/library$/.test(new URL(page.url()).pathname)) {
    await tabBar(page).getByRole('link', { name: 'Library' }).click();
  }
  await expect(page).toHaveURL('/library');
  await expect(page.locator('app-library-tile').first()).toBeVisible();
}

/** Makes the tags reachable: inline in the sidebar, or the Tags tab on a phone. */
export async function openTags(page: Page): Promise<void> {
  if (!isCompact(page)) {
    return;
  }
  if (!/\/tags$/.test(new URL(page.url()).pathname)) {
    await tabBar(page).getByRole('link', { name: 'Tags' }).click();
  }
  await expect(page).toHaveURL('/tags');
  await expect(page.getByRole('heading', { level: 1, name: 'Tags' })).toBeVisible();
}

/** `page.goto`, then opens the sidebar on a phone. */
export async function gotoWithSidebar(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await openSidebar(page);
}

/** `page.goto`, then opens the tags on a phone. */
export async function gotoWithTags(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await openTags(page);
}

/**
 * The entry of a library view ("All links", "Unsorted", "Favorites", "Recently opened"): a row of
 * the sidebar tree, or a tile of the Library page on a phone.
 */
export function viewEntry(page: Page, name: string): Locator {
  return isCompact(page)
    ? page.locator('app-library-tile').getByRole('link', { name: new RegExp(`^${name}\\b`) })
    : page.getByRole('treeitem', { name: new RegExp(`^${name}\\b`) });
}

import type { Page } from '@playwright/test';

/**
 * Accessible name of the button that opens the search dialog: "Search" (with the shortcut hint)
 * from 64em to 80em, the icon button "Search" of the tab bar on a phone. From 80em the header has
 * a search field instead (`SEARCH_FIELD_NAME`).
 */
export const SEARCH_BUTTON = /^Search$/;

/** Accessible name of the search field (header field from 80em, field of the dialog). */
export const SEARCH_FIELD_NAME = 'Search links, folders and tags';

/** The header search turns from a button into a field at 80em (1280px, #329). */
const WIDE_MIN_PX = 1280;
/** A desktop width below it: the header has the "Search" button and the dialog opens from it. */
export const DIALOG_DESKTOP_WIDTH = 1180;

/**
 * Makes the header show the "Search" button (a desktop at the 1280px default is wide enough for
 * the field): the dialog flows (button, Ctrl+K opening the dialog) run at 1180px. The tablet and
 * phone projects are already narrower and keep their size.
 */
export async function useSearchDialogWidth(page: Page): Promise<void> {
  const size = page.viewportSize();
  if (size && size.width >= WIDE_MIN_PX) {
    await page.setViewportSize({ width: DIALOG_DESKTOP_WIDTH, height: size.height });
  }
}

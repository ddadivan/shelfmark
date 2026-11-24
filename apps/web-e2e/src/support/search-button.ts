import { expect, type Locator, type Page } from '@playwright/test';
import { isCompact, tabBar } from './sidebar';

/**
 * Accessible name of the tab bar button that opens the full-screen search in the mobile shell
 * (below 64em). From 64em the header has a search field instead (`SEARCH_FIELD_NAME`), Shelf
 * block 3.
 */
export const SEARCH_BUTTON = /^Search$/;

/** Accessible name of the search field (header field from 64em, field of the dialog). */
export const SEARCH_FIELD_NAME = 'Search links, folders and tags';

/**
 * Where the search dialog flows start: a library feed in the mobile shell (the tab bar opens the
 * dialog), a settings page from 64em, the only place where the header has no field and Ctrl+K
 * opens the dialog (Shelf block 3).
 */
export function searchDialogStart(page: Page): string {
  return isCompact(page) ? '/links' : '/settings/account';
}

/** The control that opens the search dialog and gets the focus back: the tab bar's Search. */
export function searchDialogTrigger(page: Page): Locator {
  return tabBar(page).getByRole('button', { name: SEARCH_BUTTON });
}

/**
 * Opens the search dialog from where `searchDialogStart` led: the tab bar's Search below 64em,
 * Ctrl+K on a settings page from 64em. Resolves with the dialog.
 */
export async function openSearchDialog(page: Page): Promise<Locator> {
  if (isCompact(page)) {
    await searchDialogTrigger(page).click();
  } else {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Control+k');
  }
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog.getByRole('combobox', { name: SEARCH_FIELD_NAME })).toBeVisible();
  return dialog;
}

import { expect, type Locator, type Page } from '@playwright/test';

export type LibraryView = 'Masonry' | 'Cards' | 'List' | 'Headlines';

/**
 * The library toolbar (Shelf): Filter, Select links, Side by side (from 80em) and Save view
 * (with a filter or search on) as their own buttons (icon-only below 80em), View (grid size and
 * card fields) from 40em, the Masonry / Cards / List / Headlines switch and the "More view
 * options" ⋯ menu with Sort by and one "Export this view…" item (a bottom sheet in the mobile
 * shell).
 * "Save this view" is the dashed chip that ends the saved views bar. A folder's own actions are
 * in the menu by its title ("Actions for <name>").
 */
export async function openMoreMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'More view options' }).click();
}

/** Switches the feed to Masonry, Cards, List or Headlines. */
export async function switchView(page: Page, view: LibraryView): Promise<void> {
  await page.getByRole('radio', { name: view, exact: true }).click();
}

/** "Export this view…" of the ⋯ menu: opens the Export dialog and returns it. */
export async function openExportView(page: Page): Promise<Locator> {
  await openMoreMenu(page);
  await page.getByRole('menuitem', { name: 'Export this view…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export links' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Picks a file format card in the Export dialog and presses its button. */
export async function exportAs(
  dialog: Locator,
  format: 'JSON' | 'Bookmarks HTML' | 'CSV',
): Promise<void> {
  await dialog.getByText(format, { exact: true }).click();
  await dialog.getByRole('button', { name: /^Export / }).click();
}

/** Picks a sort order from the sort items. */
export async function chooseSort(page: Page, name: string): Promise<void> {
  await openMoreMenu(page);
  await page.getByRole('menuitemradio', { name }).click();
}

/** The feed is sorted as `name` (the checked sort item of the menu). */
export async function expectSort(page: Page, name: string): Promise<void> {
  await openMoreMenu(page);
  await expect(page.getByRole('menuitemradio', { name })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
}

/** The "Side by side" toolbar toggle (from 80em), `aria-pressed` while it is open. */
export function sideBySideItem(page: Page) {
  return page.getByRole('button', { name: 'Side by side', exact: true });
}

/** Opens or closes Side by side from its toolbar button. */
export async function toggleSideBySide(page: Page): Promise<void> {
  await sideBySideItem(page).click();
}

/** The toolbar's Filter button: "Filter", or "Filter · N" with N filters on. */
export function filterButton(page: Page) {
  return page.getByRole('button', { name: /^Filter( · \d+)?$/u });
}

/** The toolbar's Select button (X): starts selecting with nothing picked. */
export function selectButton(page: Page) {
  return page.getByRole('button', { name: 'Select links', exact: true });
}

/** The "Save this view" chip that ends the saved views bar (Shelf 13-views), on every width. */
export async function openSaveThisView(page: Page): Promise<void> {
  await page
    .locator('app-saved-view-chips')
    .getByRole('button', { name: 'Save this view' })
    .click();
}

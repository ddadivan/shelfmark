import { expect, type Locator, type Page } from '@playwright/test';
import { isCompact, isPhone } from './sidebar';

export type LibraryView = 'Masonry' | 'Cards' | 'List' | 'Headlines';

/**
 * The library toolbar (Shelf): Filter, Select links, Side by side (from 80em) and Save view
 *  as their own buttons (icon-only below 80em), View (grid size and
 * card fields) from 40em, the Masonry / Cards / List / Headlines switch, Sort (a menu of the four
 * orders, a bottom sheet in the mobile shell) and Export ("Export this view…") as buttons of their
 * own. The "More view options" ⋯ menu (Sort by and Export) exists only while the toolbar is slim:
 * beside the link preview and in side by side.
 * "Save this view" is the dashed chip that ends the saved views bar on phones only; wider screens
 * use the toolbar's Save view button (author). A folder's own actions are
 * in the menu by its title ("Actions for <name>").
 */
export async function openMoreMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'More view options' }).click();
}

/** The toolbar's Sort button: named "Sort: <current order>". */
export function sortButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Sort: / });
}

/** The toolbar's Export button ("Export this view…"; opens the Export dialog). */
export function exportButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Export this view…' });
}

/** Switches the feed to Masonry, Cards, List or Headlines. */
export async function switchView(page: Page, view: LibraryView): Promise<void> {
  if (isCompact(page)) {
    // The mobile shell keeps the view switch inside the View menu.
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('radio', { name: view, exact: true }).click();
    await page.keyboard.press('Escape');
    return;
  }
  await page.getByRole('radio', { name: view, exact: true }).click();
}

/** "Export this view…" of the ⋯ menu: opens the Export dialog and returns it. */
export async function openExportView(page: Page): Promise<Locator> {
  await exportButton(page).click();
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
  await sortButton(page).click();
  await page.getByRole('menuitemradio', { name }).click();
}

/** The feed is sorted as `name` (the checked sort item of the menu). */
export async function expectSort(page: Page, name: string): Promise<void> {
  await sortButton(page).click();
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

/** The phone's saved views picker (the views are a menu in the toolbar's row, not a chip bar). */
export function savedViewsPicker(page: Page): Locator {
  return page.getByRole('button', { name: /^Saved view: / });
}

/**
 * A saved view of the feed by its name (a regular expression or text): the chip of the Saved views
 * bar, on a phone the radio item of the picker's menu (this opens the menu; `Escape` closes it).
 */
export async function savedViewEntry(page: Page, name: string | RegExp): Promise<Locator> {
  if (!isPhone(page)) {
    return page.getByRole('toolbar', { name: 'Saved views' }).getByRole('button', { name });
  }
  await savedViewsPicker(page).click();
  return page.getByRole('menuitemradio', { name });
}

/** Opens the New view dialog for the current filter (the Save view button, on a phone the picker). */
export async function openSaveThisView(page: Page): Promise<void> {
  if (isPhone(page)) {
    await savedViewsPicker(page).click();
    await page.getByRole('menuitem', { name: 'Save this view' }).click();
    return;
  }
  await saveThisViewButton(page).click();
}

/**
 * Saves the current filter: the toolbar's Save view button (on a phone: "Save this view" in the
 * picker's menu, see `openSaveThisView`).
 */
export function saveThisViewButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Save view', exact: true });
}

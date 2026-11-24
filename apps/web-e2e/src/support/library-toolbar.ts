import { expect, type Page } from '@playwright/test';
import { isCompact } from './sidebar';

export type LibraryView = 'Masonry' | 'Cards' | 'List';

/**
 * The library toolbar (Shelf): on every width the Masonry / Cards / List switch and the "More
 * view options" ⋯ menu with Sort by, Side by side, Save this view and Export (a bottom sheet in the
 * mobile shell; block 1 replaced the phone's one "Options" menu); View (grid size and card
 * fields) from 40em.
 */
export async function openMoreMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'More view options' }).click();
}

/** Switches the feed to Masonry, Cards or List. */
export async function switchView(page: Page, view: LibraryView): Promise<void> {
  await page.getByRole('radio', { name: view, exact: true }).click();
}

/** Opens the menu that holds the export items (the ⋯ menu). */
export async function openExportMenu(page: Page): Promise<void> {
  await openMoreMenu(page);
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

/** The "Side by side" item of the ⋯ menu (from 80em). */
export function sideBySideItem(page: Page) {
  return page.getByRole('menuitemcheckbox', { name: 'Side by side', exact: true });
}

/** Opens or closes Side by side from the ⋯ menu. */
export async function toggleSideBySide(page: Page): Promise<void> {
  await openMoreMenu(page);
  await sideBySideItem(page).click();
}

/** The "Save this view" control: the ⋯ menu item on desktop, the button after the tabs below 64em. */
export async function openSaveThisView(page: Page): Promise<void> {
  if (isCompact(page)) {
    await page
      .locator('app-saved-view-chips')
      .getByRole('button', { name: 'Save this view' })
      .click();
  } else {
    await openMoreMenu(page);
    await page.getByRole('menuitem', { name: 'Save this view' }).click();
  }
}

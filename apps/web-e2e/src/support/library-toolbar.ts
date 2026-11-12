import { expect, type Page } from '@playwright/test';
import { isPhone } from './sidebar';

export type LibraryView = 'Cards' | 'List';

/**
 * The library toolbar. From 40em (tablet and desktop) it has a sort button, a Cards / List switch
 * and an Export button; a phone has one "View" menu with all of them (Sort by, View, Export).
 */
async function openViewMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'View', exact: true }).click();
}

/** Switches the feed to Cards or List. */
export async function switchView(page: Page, view: LibraryView): Promise<void> {
  if (isPhone(page)) {
    await openViewMenu(page);
    await page.getByRole('menuitemradio', { name: view }).click();
  } else {
    await page.getByRole('radio', { name: view }).click();
  }
}

/** Opens the menu that holds the export items (the Export button, or the phone's View menu). */
export async function openExportMenu(page: Page): Promise<void> {
  if (isPhone(page)) {
    await openViewMenu(page);
  } else {
    await page.getByRole('button', { name: 'Export' }).click();
  }
}

/** Picks a sort order from the sort menu. */
export async function chooseSort(page: Page, name: string): Promise<void> {
  if (isPhone(page)) {
    await openViewMenu(page);
  } else {
    await page.getByRole('button', { name: /^Sort: / }).click();
  }
  await page.getByRole('menuitemradio', { name }).click();
}

/** The feed is sorted as `name` (the sort button's label, or the checked item of the phone menu). */
export async function expectSort(page: Page, name: string): Promise<void> {
  if (isPhone(page)) {
    await openViewMenu(page);
    await expect(page.getByRole('menuitemradio', { name })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
  } else {
    await expect(page.getByRole('button', { name: `Sort: ${name}` })).toBeVisible();
  }
}

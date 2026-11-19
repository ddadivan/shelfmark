import { expect, type Locator, type Page } from '@playwright/test';
import { isCompact, tabBar } from './sidebar';

/** The "Data & help" row of the desktop sidebar footer. */
export function dataRow(page: Page): Locator {
  return page.getByRole('treeitem', { name: /^Data & help/ });
}

/** The data menu (desktop), opened from the sidebar footer row. */
export async function openDataMenu(page: Page): Promise<Locator> {
  await dataRow(page).click();
  const menu = page.getByRole('menu', { name: 'Data and help' });
  await expect(menu).toBeVisible();
  return menu;
}

/** Goes to the You tab (a phone and the tablet shell). */
export async function openYouTab(page: Page): Promise<void> {
  await tabBar(page).getByRole('link', { name: 'You' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible();
}

/** Opens "Import links" or "Export" the way each device has it: the data menu, or the You group. */
export async function openDataDialog(page: Page, entry: 'Import links' | 'Export'): Promise<void> {
  if (isCompact(page)) {
    await openYouTab(page);
    await page
      .getByRole('group', { name: 'Import and export' })
      .getByRole('link', { name: entry })
      .click();
  } else {
    const menu = await openDataMenu(page);
    await menu.getByRole('menuitem', { name: entry }).click();
  }
}

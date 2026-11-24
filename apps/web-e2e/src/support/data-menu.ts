import { expect, type Locator, type Page } from '@playwright/test';
import { openYouPage } from './mock-session';
import { isCompact } from './sidebar';

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

/** Goes to the You list of the mobile shell (account menu, Settings). */
export async function openYouTab(page: Page): Promise<void> {
  await openYouPage(page);
}

/**
 * Opens "Import links" or "Export" the way each device has it: the data menu, or the "Import and
 * export" group of Your data in the mobile shell (Shelf block 5).
 */
export async function openDataDialog(page: Page, entry: 'Import links' | 'Export'): Promise<void> {
  if (isCompact(page)) {
    await openYouPage(page);
    await page.getByRole('main').getByRole('link', { name: 'Your data' }).click();
    await page
      .getByRole('group', { name: 'Import and export' })
      .getByRole('button', { name: entry })
      .click();
  } else {
    const menu = await openDataMenu(page);
    await menu.getByRole('menuitem', { name: entry }).click();
  }
}

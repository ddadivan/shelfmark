import { expect, type Locator, type Page } from '@playwright/test';
import { pickFolderMenuItem } from './a11y-flows';
import { isPhone, openSidebar, viewEntry } from './sidebar';

/**
 * Deletes the first link of the feed through its card menu and the confirmation; resolves with its
 * title. The delete itself is sent when the Undo toast closes or Trash opens.
 */
export async function deleteFirstLink(page: Page): Promise<string> {
  const card = page.locator('ui-card').first();
  const title = await card.getByRole('heading').innerText();
  await card.getByRole('button', { name: /^Actions for / }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  return title;
}

/**
 * Deletes the Reading folder with its links through the folder menu; resolves with the number of
 * links that went with it (as the dialog said).
 */
export async function deleteReadingFolderWithLinks(page: Page): Promise<number> {
  await pickFolderMenuItem(page, 'Reading', 'Delete folder…');
  const dialog = page.getByRole('dialog', { name: 'Delete folder “Reading”?' });
  const text = await dialog.getByText(/It has \d+ links/).innerText();
  const links = Number(/It has (\d+) links/.exec(text)?.[1]);
  // The native radio is visually hidden; its label is the click target.
  await dialog.getByText('Delete links too').click();
  await dialog.getByRole('button', { name: /^Delete folder and \d+ links$/ }).click();
  await expect(page.getByText('Folder moved to Trash')).toBeVisible();
  return links;
}

/** Opens Trash from the sidebar row (the Library tile on a phone); client side, so the mock state stays. */
export async function openTrash(page: Page): Promise<void> {
  await openSidebar(page);
  await viewEntry(page, 'Trash').click();
  await expect(page).toHaveURL('/trash');
  await expect(page.getByRole('heading', { level: 1, name: 'Trash' })).toBeVisible();
}

/** The row of an entry in Trash. */
export function trashRow(page: Page, title: string): Locator {
  return page.locator('app-trash-row').filter({ hasText: title });
}

/**
 * Presses a button of a Trash row. On a phone the Restore and Delete buttons wait behind the row:
 * focusing one (what a keyboard user does) slides the row aside, then it is clickable.
 */
export async function pressRowButton(page: Page, name: string): Promise<void> {
  const button = page.getByRole('button', { name, exact: true });
  if (isPhone(page)) {
    await button.focus();
  }
  await button.click();
}

/** Restores one entry with its Restore button. */
export async function restoreRow(page: Page, title: string): Promise<void> {
  await pressRowButton(page, `Restore ${title}`);
}

/** Deletes one entry for good: the row menu on desktop, the swipe button on a phone, then the confirmation. */
export async function deleteRowForever(page: Page, title: string): Promise<void> {
  if (isPhone(page)) {
    await pressRowButton(page, `Delete ${title} forever`);
  } else {
    await page.getByRole('button', { name: `More for ${title}`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Delete forever' }).click();
  }
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete forever', exact: true })
    .click();
}

/** Selects a row: its checkbox on desktop, a long press on a phone (the first one; then the checkbox). */
export async function selectRow(page: Page, title: string, first: boolean): Promise<void> {
  if (isPhone(page) && first) {
    await trashRow(page, title).locator('.trash-row__surface').dispatchEvent('pointerdown', {
      bubbles: true,
      isPrimary: true,
      pointerType: 'touch',
      button: 0,
    });
    await page.waitForTimeout(650);
    await trashRow(page, title).locator('.trash-row__surface').dispatchEvent('pointerup', {
      bubbles: true,
      isPrimary: true,
      pointerType: 'touch',
      button: 0,
    });
    await expect(page.getByRole('toolbar')).toContainText('1 selected');
  } else {
    // The native checkbox is visually hidden; its label is the click target.
    await trashRow(page, title).locator('label.ui-checkbox__label').click();
  }
}

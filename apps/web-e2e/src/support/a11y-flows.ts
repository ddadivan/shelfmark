import { expect, type Locator, type Page } from '@playwright/test';
import { MOCK_LINKS_SCENARIO } from '../models/mock-links-scenario.const';
import { seedSession } from './mock-session';
import { openSidebar, openTags } from './sidebar';

/** Signed-in user on a screen that lists links. */
export async function openSignedIn(page: Page, path: string): Promise<void> {
  await seedSession(page);
  await page.goto(path);
}

export async function openFeed(page: Page, path = '/links'): Promise<void> {
  await openSignedIn(page, path);
  await expect(page.locator('ui-card').first()).toBeVisible();
}

export async function openEmptyFeed(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.empty],
  );
  await openSignedIn(page, '/links');
  await expect(page.getByRole('heading', { name: 'Your links will live here' })).toBeVisible();
}

/** The Account page of a new user with nothing saved (#352: Your shelf's empty state, Your data). */
export async function openEmptyAccount(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.empty],
  );
  await openSignedIn(page, '/settings/account');
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible();
}

/** Opens the context menu of a folder row and picks an item (the Library tab opens first on a phone). */
export async function pickFolderMenuItem(page: Page, folder: string, item: string): Promise<void> {
  await openSidebar(page);
  await page
    .getByRole('treeitem', { name: new RegExp(`^${folder}\\b`) })
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: item }).click();
}

/** Opens the context menu of a tag chip (the Tags tab opens first on a phone). */
export async function openTagMenu(page: Page, tag: string): Promise<void> {
  await openTags(page);
  await page
    .locator('app-sidebar-tags')
    .getByRole('button', { name: tag, exact: true })
    .click({ button: 'right' });
}

/** Opens the context menu of a tag chip and picks an item. */
export async function pickTagMenuItem(page: Page, tag: string, item: string): Promise<void> {
  await openTagMenu(page, tag);
  await page.getByRole('menuitem', { name: item }).click();
}

/** Opens "Edit" from the menu of the first card and returns the dialog. */
export async function openCardEdit(page: Page): Promise<Locator> {
  await page
    .locator('ui-card')
    .first()
    .getByRole('button', { name: /^Actions for / })
    .click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit link' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Opens "Move to folder…" from the menu of the first card and returns the picker. */
export async function openCardMove(page: Page): Promise<Locator> {
  await page
    .locator('ui-card')
    .first()
    .getByRole('button', { name: /^Actions for / })
    .click();
  await page.getByRole('menuitem', { name: 'Move to folder…' }).click();
  const picker = page.getByRole('dialog', { name: /^Move “/ });
  await expect(picker).toBeVisible();
  return picker;
}

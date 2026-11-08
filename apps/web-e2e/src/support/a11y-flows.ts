import { expect, type Page } from '@playwright/test';
import { MOCK } from '../models/mock-ids.const';
import { MOCK_LINKS_SCENARIO } from '../models/mock-links-scenario.const';
import { seedSession } from './mock-session';
import { openSidebar } from './sidebar';

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

/** Opens the context menu of a folder row and picks an item (the drawer opens first on a phone). */
export async function pickFolderMenuItem(page: Page, item: string): Promise<void> {
  await openSidebar(page);
  await page
    .getByRole('treeitem', { name: new RegExp(`^${MOCK.readingName}\\b`) })
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: item }).click();
}

/** Opens the context menu of a tag chip and picks an item. */
export async function pickTagMenuItem(page: Page, tag: string, item: string): Promise<void> {
  await openSidebar(page);
  await page
    .getByRole('navigation', { name: 'Library' })
    .getByRole('button', { name: tag, exact: true })
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: item }).click();
}

export async function openCardEdit(page: Page): Promise<void> {
  await page
    .locator('ui-card')
    .first()
    .getByRole('button', { name: /^Actions for / })
    .click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit link' })).toBeVisible();
}

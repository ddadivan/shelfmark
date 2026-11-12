import { expect, type Locator, type Page } from '@playwright/test';
import { PROMO_SHARE } from '../models/promo-share.const';
import { tabBar } from '../../src/support/sidebar';
import { Finger } from '../../src/support/touch';
import type { PromoContext } from '../models/promo-context.interface';

/** A held finger opens a row's menu (`uiLongPress`, 500 ms); a little longer reads well on video. */
const LONG_PRESS_MS = 750;

/** Taps a tab of the phone tab bar (Library, Tags, You). */
export async function pressTab({ page, director }: PromoContext, name: string): Promise<void> {
  await director.press(tabBar(page).getByRole('link', { name }));
}

/** A sidebar entry (desktop) or, on the phone, the same row on the Library page. */
export async function libraryEntry(context: PromoContext, name: string | RegExp): Promise<Locator> {
  const { page, phone } = context;
  const pattern = typeof name === 'string' ? new RegExp(`^${name}\\b`) : name;
  if (phone) {
    await pressTab(context, 'Library');
    await expect(page).toHaveURL(/\/library$/);
    const tile = page.locator('app-library-tile').getByRole('link', { name: pattern });
    if ((await tile.count()) > 0) {
      return tile.first();
    }
  }
  return page.getByRole('treeitem', { name: pattern }).first();
}

/** Opens the menu of a target as a person would: right click, or a long press on the phone. */
export async function openContextMenu(
  { page, phone, director }: PromoContext,
  target: Locator,
): Promise<void> {
  await director.reveal(target);
  if (phone) {
    const box = await target.boundingBox();
    if (!box) {
      throw new Error('the menu target has no box');
    }
    const finger = await Finger.down(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await finger.hold(LONG_PRESS_MS);
    await finger.up();
  } else {
    await director.point(target);
    await director.pause(150);
    await target.click({ button: 'right' });
  }
  await expect(page.getByRole('menu').filter({ visible: true }).first()).toBeVisible();
}

/**
 * Picks an item of a folder's menu: a right click in the sidebar, or the row's "…" button on the
 * phone's Library page (always shown on touch).
 */
export async function folderMenu(
  context: PromoContext,
  folder: string,
  item: string,
): Promise<void> {
  const { page, director } = context;
  const row = page.getByRole('treeitem', { name: new RegExp(`^${folder}\\b`) });
  if (context.phone) {
    await libraryEntry(context, folder);
    await director.press(row.getByRole('button', { name: `Actions for ${folder}` }));
    await expect(page.getByRole('menu').filter({ visible: true }).first()).toBeVisible();
  } else {
    await openContextMenu(context, row);
  }
  await director.pause(300);
  await director.press(
    page.getByRole('menuitem', { name: item }).filter({ visible: true }).first(),
  );
}

/**
 * Opens a settings section through the interface (a reload would start a fresh demo library):
 * the account menu and the settings nav on desktop, the You tab and its list on the phone.
 */
export async function openSettings(context: PromoContext, section: string): Promise<void> {
  const { page, phone, director } = context;
  if (phone) {
    await pressTab(context, 'You');
    await director.press(page.getByRole('main').getByRole('link', { name: section }));
    return;
  }
  const nav = page.getByRole('navigation', { name: 'Settings' });
  if (!(await nav.isVisible())) {
    await director.press(page.getByRole('button', { name: 'Account menu' }));
    await director.press(page.getByRole('menuitem', { name: 'Settings' }));
  }
  await director.press(nav.getByRole('link', { name: section }));
}

/** Back to All links: the sidebar row (from Settings, its "Back to links"), or the phone's tile. */
export async function backToAllLinks(context: PromoContext): Promise<void> {
  const { page, phone, director } = context;
  if (!phone) {
    const back = page.getByRole('navigation', { name: 'Settings' }).getByRole('link', {
      name: 'Back to links',
    });
    if (await back.isVisible()) {
      await director.press(back);
    }
  }
  await director.press(await libraryEntry(context, /^All links\b/));
  await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
}

/**
 * Signs the made-up regular mock account in (demo accounts cannot share) under the `showcase`
 * scenario, so it gets the demo's mockup library, and opens All links (#326).
 */
export async function useShareAccount(page: Page): Promise<void> {
  await page.evaluate((share) => {
    localStorage.setItem(share.SessionKey, JSON.stringify(share.User));
    sessionStorage.setItem(share.ScenarioKey, share.Scenario);
  }, PROMO_SHARE);
  await page.goto('/links');
}

/** Opens a public collection as a guest: the same tab without the session (#326). */
export async function openAsGuest(page: Page, path: string): Promise<void> {
  await page.evaluate((key) => localStorage.removeItem(key), PROMO_SHARE.SessionKey);
  await page.goto(path);
}

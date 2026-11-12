import { expect, type Locator, type Page } from '@playwright/test';
import { PROMO_SHARE } from '../models/promo-share.const';
import { tabBar } from '../../src/support/sidebar';
import { settled } from '../../src/support/settled';
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
    // Pointer events as a held finger sends them (as the e2e suite does): a real touch end would
    // land on the menu that opened under the finger and close it again.
    const touch = {
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 7,
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    };
    await target.dispatchEvent('pointerdown', touch);
    await director.pause(LONG_PRESS_MS);
    await target.dispatchEvent('pointerup', touch);
  } else {
    await director.point(target);
    await director.pause(150);
    await target.click({ button: 'right' });
  }
  await expect(page.getByRole('menu').filter({ visible: true }).first()).toBeVisible();
}

/**
 * Picks an item of a folder's menu: a right click in the sidebar; on the phone's Library page the
 * row's "…" button (always shown on touch), or with `longPress` a held finger on the row.
 */
export async function folderMenu(
  context: PromoContext,
  folder: string,
  item: string,
  longPress = false,
): Promise<void> {
  const { page, director } = context;
  const row = page.getByRole('treeitem', { name: new RegExp(`^${folder}\\b`) });
  if (context.phone) {
    await libraryEntry(context, folder);
  }
  if (context.phone && !longPress) {
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

/** A point in the middle of a locator's box. */
async function centreOf(target: Locator): Promise<{ x: number; y: number }> {
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('the drag target has no box');
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Rest longer than the touch drag delay (400 ms), shorter than the long press (500 ms). */
const TOUCH_DRAG_REST_MS = 440;

/**
 * Drags `source` to a point of `target` (`edge`: just inside its top or bottom edge, where a
 * reorder line shows): a slow mouse drag, or on the phone a press, a short rest and a slide.
 * The item hovers the target for `holdMs` before the drop; `dropHint`, when given, must say
 * "Move here" by then.
 */
export async function dragTo(
  { page, phone, director }: PromoContext,
  source: Locator,
  target: Locator,
  edge: 'top' | 'bottom' | 'centre',
  holdMs = 500,
  dropHint?: Locator,
): Promise<void> {
  const hold = async (): Promise<void> => {
    if (dropHint) {
      await expect(dropHint).toContainText('Move here');
    }
    await director.pause(holdMs);
  };
  await director.reveal(source);
  const from = await centreOf(source);
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('the drop target has no box');
  }
  const to = {
    x: box.x + box.width / 2,
    y:
      edge === 'top'
        ? box.y + 2
        : edge === 'bottom'
          ? box.y + box.height - 2
          : box.y + box.height / 2,
  };
  if (phone) {
    const finger = await Finger.down(page, from);
    await finger.hold(TOUCH_DRAG_REST_MS);
    await finger.move(to, 24);
    await hold();
    await finger.up();
    return;
  }
  await page.mouse.move(from.x, from.y, { steps: 20 });
  await director.pause(250);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + (to.y > from.y ? 8 : -8), { steps: 4 });
  for (let step = 1; step <= 30; step++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * step) / 30,
      from.y + ((to.y - from.y) * step) / 30,
    );
    await director.pause(16);
  }
  await hold();
  await page.mouse.up();
}

/** Picks a radio of a settings radio group by its label, as a person would. */
export async function pickChoice(
  { page, director }: PromoContext,
  group: string,
  name: string,
): Promise<void> {
  const radios = page.getByRole('radiogroup', { name: group });
  const label = radios
    .locator('label', { has: page.getByRole('radio', { name, exact: true }) })
    .first();
  await director.press(label);
  await expect(radios.getByRole('radio', { name, exact: true })).toBeChecked();
}

/**
 * Opens a settings section through the interface (a reload would start a fresh demo library):
 * the account menu and the settings nav on desktop, the You tab and its list on the phone.
 */
export async function openSettings(context: PromoContext, section: string): Promise<void> {
  const { page, phone, director } = context;
  if (phone) {
    await pressTab(context, 'You');
    await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible();
    // The page slides in: let it settle before the finger goes down.
    await settled(page);
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
  await expect(page.locator('ui-card').first()).toBeVisible();
}

/**
 * Signs the made-up regular mock account in (demo accounts cannot share) under the `showcase`
 * scenario, so it gets the demo's mockup library, and opens All links (#326).
 */
export async function useShareAccount(page: Page): Promise<void> {
  await page.evaluate((share) => {
    localStorage.setItem(share.SessionKey, JSON.stringify(share.User));
    sessionStorage.setItem(share.ScenarioKey, share.Scenario);
    // An account of nine days: the rating question comes 5 s after the load, once no dialog is open.
    const createdAt = new Date(Date.now() - share.RatingAgeDays * 86_400_000).toISOString();
    localStorage.setItem(share.RatingKey, JSON.stringify({ createdAt }));
  }, PROMO_SHARE);
  await page.goto('/links');
}

/** Opens a public collection as a guest: the same tab without the session (#326). */
export async function openAsGuest(page: Page, path: string): Promise<void> {
  await page.evaluate((key) => localStorage.removeItem(key), PROMO_SHARE.SessionKey);
  await page.goto(path);
}

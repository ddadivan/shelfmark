import { type Locator, type Page } from '@playwright/test';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { openFeed, pickFolderMenuItem } from './support/a11y-flows';
import { openSettingsSection } from './support/mock-session';
import { gotoWithSidebar, isPhone, openSidebar, tabBar } from './support/sidebar';
import { settled } from './support/settled';
import { expect, test } from './support/test';
import { Finger } from './support/touch';

const READING = MOCK_FIXTURE.readingName;
const NOTES = 'Notes';
const PIN_LIMIT = 7;

// The mock state lives in the page: after the first load every step navigates inside the app.
test.describe('folder style and pins (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  const pinned = (page: Page): Locator => page.locator('app-sidebar-pinned section.pinned');
  const pinnedItems = (page: Page): Locator => pinned(page).locator('.pinned__item');
  const coloured = (page: Page, colour: string): Locator =>
    page.locator(`ui-folder-icon.ui-folder-icon--${colour}`);

  // The native radio sits under its drawing: click the option (its label) like a person would.
  async function choose(dialog: Locator, name: string): Promise<void> {
    await dialog
      .locator('label.ui-choice', { has: dialog.page().getByLabel(name, { exact: true }) })
      .click();
  }

  // The menu of one trigger; closed menus of other cards stay in the DOM while they fade out.
  async function menuItem(trigger: Locator, name: string): Promise<Locator> {
    await trigger.click();
    const menuId = await trigger.getAttribute('aria-controls');
    return trigger.page().locator(`#${menuId}`).getByRole('menuitem', { name });
  }

  const cardMenuItem = (card: Locator, item: string) =>
    menuItem(card.getByRole('button', { name: /^Actions for / }), item);

  // From a folder page or Settings back to a place with the folder tree (the Library tab on a phone).
  async function backToTree(page: Page): Promise<void> {
    if (isPhone(page)) {
      await tabBar(page).getByRole('link', { name: 'Library' }).click();
      await expect(page).toHaveURL('/library');
      await expect(page.locator('app-library-tile').first()).toBeVisible();
    } else if (/\/settings\//.test(page.url())) {
      await page
        .getByRole('navigation', { name: 'Settings' })
        .getByRole('link', { name: 'Back to links' })
        .click();
    }
  }

  async function createNotes(page: Page): Promise<void> {
    await openSidebar(page);
    await page.getByRole('button', { name: 'New folder' }).click();
    const dialog = page.getByRole('dialog', { name: 'New folder' });
    await dialog.getByLabel('Name').fill(NOTES);
    await dialog.getByRole('button', { name: 'Create folder' }).click();
    await expect(dialog).toHaveCount(0);
    await backToTree(page);
    await expect(page.getByRole('treeitem', { name: new RegExp(`^${NOTES}\\b`) })).toBeVisible();
  }

  async function chooseStyle(page: Page, colour: string, icon: string): Promise<void> {
    await pickFolderMenuItem(page, READING, 'Colour and icon…');
    const dialog = page.getByRole('dialog', { name: READING });
    await expect(dialog).toBeVisible();
    await choose(dialog, colour);
    await choose(dialog, icon);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);
  }

  test.beforeEach(async ({ page }) => {
    await openFeed(page);
  });

  test('the colour and icon dialog saves a style that shows on the folder row', async ({
    page,
  }) => {
    await openSidebar(page);
    await expect(coloured(page, 'clay')).toHaveCount(0);

    await chooseStyle(page, 'Clay', 'Star');

    await expect(coloured(page, 'clay').first()).toBeVisible();
  });

  test('the dialog radio groups move with the arrow keys, Reset goes back to graphite', async ({
    page,
  }) => {
    await pickFolderMenuItem(page, READING, 'Colour and icon…');
    const dialog = page.getByRole('dialog', { name: READING });
    const sage = dialog.getByRole('radio', { name: 'Sage', exact: true });
    await choose(dialog, 'Sage');
    await sage.focus();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('radio', { name: 'Ocean', exact: true })).toBeChecked();

    await dialog.getByRole('button', { name: 'Reset' }).click();

    await expect(dialog.getByRole('radio', { name: 'Graphite', exact: true })).toBeChecked();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('pins and unpins a folder from its menu', async ({ page }) => {
    await expect(pinned(page)).toHaveCount(0);

    await pickFolderMenuItem(page, READING, 'Pin to sidebar');
    await expect(pinned(page).getByRole('heading', { name: 'Pinned' })).toBeVisible();
    await expect(pinnedItems(page)).toHaveCount(1);
    await expect(pinnedItems(page).first()).toContainText(READING);

    await pickFolderMenuItem(page, READING, 'Unpin from sidebar');
    await expect(pinned(page)).toHaveCount(0);
  });

  test("unpins from the row's Unpin button (hover on desktop, always on touch) with Undo", async ({
    page,
  }) => {
    await pickFolderMenuItem(page, READING, 'Pin to sidebar');
    await expect(pinnedItems(page)).toHaveCount(1);
    const row = pinnedItems(page).first();
    const unpin = row.getByRole('button', { name: `Unpin ${READING}` });
    const actions = row.locator('.pinned__actions');
    if (!isPhone(page)) {
      await expect(actions).toHaveCSS('opacity', '0');
      await row.hover();
    }
    await expect(actions).toHaveCSS('opacity', '1');
    await unpin.click();
    await expect(pinned(page)).toHaveCount(0);

    const toast = page.locator('ui-toast').filter({ hasText: 'Unpinned from sidebar' });
    await expect(toast).toContainText(READING);
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(pinnedItems(page)).toHaveCount(1);
    await expect(pinnedItems(page).first()).toContainText(READING);
  });

  test('pins a link from its card menu and unpins it from its Pinned row', async ({ page }) => {
    const card = page.locator('ui-card').first();
    const title = (await card.getByRole('link').first().innerText()).trim();
    await (await cardMenuItem(card, 'Pin to sidebar')).click();

    await openSidebar(page);
    await expect(pinnedItems(page)).toHaveCount(1);
    await expect(pinnedItems(page).first()).toContainText(title);

    const row = pinnedItems(page).first();
    if (!isPhone(page)) {
      await row.hover();
    }
    await row.getByRole('button', { name: `Unpin ${title}` }).click();
    await expect(pinned(page)).toHaveCount(0);
  });

  test('reorders pinned items with Alt+ArrowDown / Alt+ArrowUp; rows have no "…" menu', async ({
    page,
  }) => {
    await createNotes(page);
    await pickFolderMenuItem(page, READING, 'Pin to sidebar');
    await pickFolderMenuItem(page, NOTES, 'Pin to sidebar');
    await expect(pinnedItems(page)).toHaveCount(2);
    await expect(pinnedItems(page).first()).toContainText(READING);

    const readingLink = pinned(page).getByRole('link', { name: new RegExp(`^${READING}\\b`) });
    await readingLink.focus();
    await page.keyboard.press('Alt+ArrowDown');
    await expect(pinnedItems(page).first()).toContainText(NOTES);
    await expect(readingLink).toBeFocused();
    await expect(page.locator('.cdk-live-announcer-element')).toHaveText(
      'Moved down, position 2 of 2',
    );

    await page.keyboard.press('Alt+ArrowUp');
    await expect(pinnedItems(page).first()).toContainText(READING);
    await expect(page.locator('.cdk-live-announcer-element')).toHaveText(
      'Moved up, position 1 of 2',
    );

    // Unpin is the only row action, so there is no "…" menu (#314).
    await expect(pinned(page).getByRole('button', { name: /^Actions for / })).toHaveCount(0);
  });

  /** Top of the sidebar's Tags section, which a reorder drag above it must never move. */
  const sidebarTagsTop = async (page: Page): Promise<number> => {
    const tags = page.locator('app-sidebar app-sidebar-tags');
    await expect(tags).toBeVisible();
    return (await tags.boundingBox())?.y ?? 0;
  };

  async function expectStill(page: Page, tagsTop: number): Promise<void> {
    const now = await sidebarTagsTop(page);
    expect(Math.abs(now - tagsTop)).toBeLessThanOrEqual(0.5);
  }

  const folderNames = (page: Page) =>
    page.locator('app-sidebar ui-tree [data-ui-tree-id] .ui-tree__name').allTextContents();

  test('reorders folders with Alt+ArrowUp on the focused row, announced (#314)', async ({
    page,
  }) => {
    await createNotes(page);
    const before = await folderNames(page);
    expect(before.indexOf(NOTES)).toBeGreaterThan(before.indexOf(READING));

    const notes = page.getByRole('treeitem', { name: new RegExp(`^${NOTES}\\b`) });
    const url = page.url();
    await notes.focus();
    await page.keyboard.press('Alt+ArrowUp');

    await expect
      .poll(async () => {
        const names = await folderNames(page);
        return names.indexOf(NOTES) < names.indexOf(READING);
      })
      .toBe(true);
    await expect(notes).toBeFocused();
    await expect(page.locator('.cdk-live-announcer-element')).toHaveText(/^Moved up, position/);
    // Not read as a plain arrow by the tree, and no other page opened.
    expect(page.url()).toBe(url);
  });

  test('reorders folders by dragging inside the Folders section (desktop, #314)', async ({
    page,
  }) => {
    test.skip(isPhone(page), 'the touch drag has its own tests below');
    await createNotes(page);
    await settled(page);
    const notes = page.getByRole('treeitem', { name: new RegExp(`^${NOTES}\\b`) });
    const reading = page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) });
    const from = await notes.boundingBox();
    const to = await reading.boundingBox();
    if (!from || !to) {
      throw new Error('folder rows have no box');
    }
    const url = page.url();
    const tagsTop = await sidebarTagsTop(page);
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 8, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + 2, { steps: 10 });
    // The place it lands is a reserved slot one row tall with a ghost of the row; the section
    // keeps its height, so Tags below does not move.
    const slot = page.locator('app-sidebar .ui-tree__drop-slot');
    await expect(slot).toHaveCount(1);
    await expect(slot).toContainText(NOTES);
    expect((await slot.boundingBox())?.height).toBeCloseTo(from.height, 0);
    await expectStill(page, tagsTop);
    await page.mouse.up();

    await expect
      .poll(async () => {
        const names = await folderNames(page);
        return names.indexOf(NOTES) < names.indexOf(READING);
      })
      .toBe(true);
    // A drag never opens a folder nor moves it into another one.
    expect(page.url()).toBe(url);
    await expect(notes).toHaveAttribute('aria-level', '1');
    await expect(page.locator('app-sidebar .ui-tree__drop-slot')).toHaveCount(0);
  });

  test('reorders pinned items by dragging (desktop)', async ({ page }) => {
    test.skip(isPhone(page), 'the touch drag has its own test below');
    await createNotes(page);
    await pickFolderMenuItem(page, READING, 'Pin to sidebar');
    await pickFolderMenuItem(page, NOTES, 'Pin to sidebar');
    await expect(pinnedItems(page)).toHaveCount(2);
    await settled(page);

    const from = await pinnedItems(page).first().boundingBox();
    const to = await pinnedItems(page).nth(1).boundingBox();
    if (!from || !to) {
      throw new Error('pinned items have no box');
    }
    const tagsTop = await sidebarTagsTop(page);
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 8, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height - 2, { steps: 10 });
    const slot = pinned(page).locator('.pinned__drop-slot');
    await expect(slot).toHaveCount(1);
    await expect(slot).toContainText(READING);
    expect((await slot.boundingBox())?.height).toBeCloseTo(from.height, 0);
    await expectStill(page, tagsTop);
    await page.mouse.up();

    await expect(pinnedItems(page).first()).toContainText(NOTES);
  });

  /** Centre of a locator's box. */
  const centre = async (locator: Locator): Promise<{ x: number; y: number }> => {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
  };
  /** Rest longer than the touch drag delay (400 ms), shorter than the long press (500 ms). */
  const DRAG_REST_MS = 440;

  test.describe('touch reorder on a phone (#315)', () => {
    test.beforeEach(({ page }) => {
      test.skip(!isPhone(page), 'touch screens only; a mouse drags at once');
    });

    const notesRow = (page: Page) =>
      page.getByRole('treeitem', { name: new RegExp(`^${NOTES}\\b`) });
    const readingRow = (page: Page) =>
      page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) });

    test('a press, a short rest and a move drag a folder; the reserved slot shows, nothing jumps', async ({
      page,
    }) => {
      await createNotes(page);
      await settled(page);
      const from = await centre(notesRow(page));
      const to = await readingRow(page).boundingBox();
      const height = (await notesRow(page).boundingBox())?.height ?? 0;
      const tilesTop = (await page.locator('app-library-tile').first().boundingBox())?.y ?? 0;

      const finger = await Finger.down(page, from);
      await finger.hold(DRAG_REST_MS);
      await finger.move({ x: from.x, y: (to?.y ?? 0) + 2 }, 12);
      const slot = page.locator('app-sidebar .ui-tree__drop-slot');
      await expect(slot).toHaveCount(1);
      await expect(slot).toContainText(NOTES);
      expect((await slot.boundingBox())?.height).toBeCloseTo(height, 0);
      // The finger moves the row, not the page.
      expect((await page.locator('app-library-tile').first().boundingBox())?.y).toBeCloseTo(
        tilesTop,
        0,
      );
      // A drag past the long-press time opens no folder menu.
      await expect(page.getByRole('menu')).toHaveCount(0);
      await finger.up();

      await expect
        .poll(async () => {
          const names = await folderNames(page);
          return names.indexOf(NOTES) < names.indexOf(READING);
        })
        .toBe(true);
      await expect(page).toHaveURL('/library');
      await expect(slot).toHaveCount(0);
      await expect(page.locator('.cdk-live-announcer-element')).toHaveText(/^Moved up, position/);
    });

    test('a long press without moving still opens the folder menu', async ({ page }) => {
      await createNotes(page);
      await settled(page);
      const finger = await Finger.down(page, await centre(notesRow(page)));
      await finger.hold(800);
      await finger.up();

      await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
      await expect(page.locator('app-sidebar .ui-tree__drop-slot')).toHaveCount(0);
      const names = await folderNames(page);
      expect(names.indexOf(NOTES)).toBeGreaterThan(names.indexOf(READING));
    });

    test('a plain swipe on a folder row scrolls the page and moves nothing', async ({ page }) => {
      await createNotes(page);
      await settled(page);
      // Room to scroll: a shorter phone screen than the Library page.
      await page.setViewportSize({ width: 360, height: 620 });
      await page.evaluate('window.scrollTo(0, 0)');
      const before = await folderNames(page);
      const start = await centre(readingRow(page));
      expect(start.y).toBeLessThan(600);

      const finger = await Finger.down(page, start);
      await finger.move({ x: start.x, y: start.y - 240 }, 8);
      await finger.up();

      await expect.poll(() => page.evaluate('window.scrollY')).toBeGreaterThan(40);
      await expect(page.locator('app-sidebar .ui-tree__drop-slot')).toHaveCount(0);
      expect(await folderNames(page)).toEqual(before);
      await expect(page).toHaveURL('/library');
    });

    test('pinned items move the same way', async ({ page }) => {
      await createNotes(page);
      await pickFolderMenuItem(page, READING, 'Pin to sidebar');
      await pickFolderMenuItem(page, NOTES, 'Pin to sidebar');
      await backToTree(page);
      await expect(pinnedItems(page)).toHaveCount(2);
      await expect(pinnedItems(page).first()).toContainText(READING);
      await settled(page);

      const from = await centre(pinnedItems(page).first());
      const to = await pinnedItems(page).nth(1).boundingBox();
      const finger = await Finger.down(page, from);
      await finger.hold(DRAG_REST_MS);
      await finger.move({ x: from.x, y: (to?.y ?? 0) + (to?.height ?? 0) - 2 }, 12);
      const slot = pinned(page).locator('.pinned__drop-slot');
      await expect(slot).toHaveCount(1);
      await expect(slot).toContainText(READING);
      await finger.up();

      await expect(pinnedItems(page).first()).toContainText(NOTES);
      await expect(page).toHaveURL('/library');
    });
  });

  test('explains the limit with a toast on the eighth pin', async ({ page }) => {
    const cards = page.locator('ui-card');
    for (let index = 0; index < PIN_LIMIT; index++) {
      await (await cardMenuItem(cards.nth(index), 'Pin to sidebar')).click();
    }

    await (await cardMenuItem(cards.nth(PIN_LIMIT), 'Pin to sidebar')).click();

    await expect(page.getByText('Pinned is full')).toBeVisible();
    await expect(page.getByText('You can pin up to 7 folders and links.')).toBeVisible();
    await openSidebar(page);
    await expect(pinnedItems(page)).toHaveCount(PIN_LIMIT);
  });

  test('pins a link to the top of its folder, with a Pinned label, and unpins it', async ({
    page,
  }) => {
    await gotoWithSidebar(page, '/links');
    await page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) }).click();
    await expect(page.getByRole('heading', { level: 1, name: READING })).toBeVisible();
    const cards = page.locator('ui-card');
    await expect(cards.nth(1)).toBeVisible();
    await settled(page);
    const title = (await cards.nth(1).getByRole('link').first().innerText()).trim();
    const second = cards.filter({ has: page.getByText(title, { exact: true }) });

    await (await cardMenuItem(second, 'Pin to top')).click();

    const first = cards.first();
    await expect(first).toContainText(title);
    await expect(first).toContainText('Pinned');

    await (await cardMenuItem(first, 'Unpin from top')).click();
    await expect(cards.first()).not.toContainText('Pinned');
  });

  test('"Pin to top" is only offered inside a folder', async ({ page }) => {
    const card = page.locator('ui-card').first();

    await expect(await cardMenuItem(card, 'Pin to sidebar')).toBeVisible();
    await expect(await cardMenuItem(card, 'Pin to top')).toHaveCount(0);
  });

  test('turning Folder colours off shows every folder in graphite', async ({ page }) => {
    await chooseStyle(page, 'Clay', 'Star');
    await openSidebar(page);
    await expect(coloured(page, 'clay').first()).toBeVisible();

    await openSettingsSection(page, 'Library');
    await settled(page);
    await page.getByRole('switch', { name: 'Folder colours' }).click();
    await expect(page.getByRole('switch', { name: 'Folder colours' })).not.toBeChecked();

    await backToTree(page);
    await expect(coloured(page, 'clay')).toHaveCount(0);
    await expect(coloured(page, 'graphite').first()).toBeVisible();
  });

  test('Settings › Library edits the pinned items', async ({ page }) => {
    await createNotes(page);
    await pickFolderMenuItem(page, READING, 'Pin to sidebar');
    await pickFolderMenuItem(page, NOTES, 'Pin to sidebar');

    await openSettingsSection(page, 'Library');
    await expect(page.getByText('Up to 7 folders and links')).toBeVisible();
    await page.getByRole('button', { name: 'Edit pinned' }).click();
    const dialog = page.getByRole('dialog', { name: 'Pinned' });
    await dialog.getByRole('button', { name: `Move ${READING} down` }).click();
    await dialog.getByRole('button', { name: `Unpin ${NOTES} from the sidebar` }).click();
    await expect(dialog.getByRole('listitem')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Done' }).click();

    await backToTree(page);
    await expect(pinnedItems(page)).toHaveCount(1);
    await expect(pinnedItems(page).first()).toContainText(READING);
  });
});

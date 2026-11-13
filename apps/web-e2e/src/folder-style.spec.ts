import { type Locator, type Page } from '@playwright/test';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { openFeed, pickFolderMenuItem } from './support/a11y-flows';
import { openSettingsSection } from './support/mock-session';
import { gotoWithSidebar, isCompact, openSidebar, tabBar } from './support/sidebar';
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

  /**
   * Nothing pinned: the sidebar drops the section; the phone Library page keeps it with its
   * "Nothing pinned yet" row (#315).
   */
  async function expectNoPins(page: Page): Promise<void> {
    if (isCompact(page) && new URL(page.url()).pathname === '/library') {
      await expect(pinnedItems(page)).toHaveCount(0);
      await expect(pinned(page).getByRole('button', { name: 'Nothing pinned yet' })).toBeVisible();
    } else {
      await expect(pinned(page)).toHaveCount(0);
    }
  }
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
    if (isCompact(page)) {
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
    await pickFolderMenuItem(page, READING, 'Color and icon…');
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

  test('own colors and an emoji: the swatches stay on one line, a "+" swatch adds a colour, one emoji replaces the icon (#335)', async ({
    page,
  }) => {
    await pickFolderMenuItem(page, READING, 'Color and icon…');
    const dialog = page.getByRole('dialog', { name: READING });
    await expect(dialog).toBeVisible();

    // The eight built-in swatches share one line.
    const swatches = dialog.locator('.ui-choice-grid--single-line .ui-choice__swatch');
    await expect(swatches).toHaveCount(8);
    const tops = await swatches.evaluateAll((nodes) =>
      nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
    );
    expect(new Set(tops).size).toBe(1);

    // "+" opens the colour picker; a finished colour is kept as a swatch and chosen.
    await dialog.getByRole('button', { name: 'Add your own color' }).click();
    const hex = dialog.getByRole('textbox', { name: 'Hex code' });
    await expect(hex).toBeFocused();
    await expect(dialog.getByRole('slider', { name: 'Hue' })).toBeVisible();
    await hex.fill('#3a7bd5');
    await hex.press('Enter');
    // Typing only previews; the explicit button keeps and chooses the colour (#350).
    await expect(dialog.getByRole('radio', { name: 'Your color #3a7bd5' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Add color', exact: true }).click();
    await expect(dialog.getByRole('radio', { name: 'Your color #3a7bd5' })).toBeChecked();
    await expect(hex).toHaveCount(0);

    // One emoji replaces the icon; anything else is refused.
    const emoji = dialog.getByRole('textbox', { name: 'Emoji' });
    await emoji.fill('pizza');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.getByText('Enter exactly one emoji.')).toBeVisible();
    await emoji.fill('🍕');
    await expect(dialog.locator('.ui-folder-icon__emoji').first()).toHaveText('🍕');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);

    await openSidebar(page);
    await expect(page.locator('.ui-folder-icon--own').first()).toBeVisible();
    await expect(page.locator('.ui-folder-icon__emoji').first()).toHaveText('🍕');
  });

  test('an own color swatch is removed with Delete, with Undo; the folder keeps the colour it wears (#350)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.use.hasTouch === true, 'the keyboard path is checked on desktop');
    await pickFolderMenuItem(page, READING, 'Color and icon…');
    const dialog = page.getByRole('dialog', { name: READING });
    const plus = dialog.getByRole('button', { name: 'Add your own color' });
    const hex = dialog.getByRole('textbox', { name: 'Hex code' });
    for (const colour of ['#3a7bd5', '#1d4f91']) {
      await plus.click();
      await hex.fill(colour);
      await dialog.getByRole('button', { name: 'Add color', exact: true }).click();
      await expect(hex).toHaveCount(0);
    }
    const first = dialog.getByRole('radio', { name: 'Your color #3a7bd5' });
    const second = dialog.getByRole('radio', { name: 'Your color #1d4f91' });
    await expect(second).toBeChecked();

    await first.focus();
    await page.keyboard.press('Delete');
    await expect(first).toHaveCount(0);
    // The colour the folder wears stays, and has no "×".
    await expect(second).toBeChecked();
    await expect(dialog.locator('.ui-choice__remove')).toHaveCount(1);
    const toast = page.getByRole('status').filter({ hasText: 'Color removed' });
    await expect(toast).toBeVisible();
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(first).toBeVisible();
  });

  test('the icon grid shows four full rows, a toggle expands every icon, no inner scroll (#335)', async ({
    page,
  }) => {
    await pickFolderMenuItem(page, READING, 'Color and icon…');
    const dialog = page.getByRole('dialog', { name: READING });
    await expect(dialog).toBeVisible();
    const toggle = dialog.getByRole('button', { name: /^Show all icons \(\d+\)$/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const more = dialog.locator('.folder-style__more');
    // Collapsed: the rest of the icons are out of the tab order and take no room.
    await expect(more).toHaveCSS('visibility', 'hidden');
    expect((await more.boundingBox())?.height ?? 0).toBeLessThan(2);
    await expect(
      dialog
        .locator('[role="radiogroup"][aria-labelledby="folder-style-icon"]')
        .first()
        .locator('input'),
    ).toHaveCount(28);

    // The toggle sits closer to the icon grid above than to the emoji field below (#350).
    const [grid, toggleBox, emoji] = await Promise.all([
      dialog
        .locator('[role="radiogroup"][aria-labelledby="folder-style-icon"]')
        .first()
        .boundingBox(),
      toggle.boundingBox(),
      dialog.locator('.folder-style__emoji').boundingBox(),
    ]);
    const above = (toggleBox?.y ?? 0) - ((grid?.y ?? 0) + (grid?.height ?? 0));
    const below = (emoji?.y ?? 0) - ((toggleBox?.y ?? 0) + (toggleBox?.height ?? 0));
    expect(below).toBeGreaterThan(above * 2);

    await expect(toggle).toHaveText('Show all icons (63)');

    await toggle.click();
    await expect(dialog.getByRole('button', { name: 'Show fewer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(more).toHaveCSS('visibility', 'visible');
    await expect.poll(async () => (await more.boundingBox())?.height ?? 0).toBeGreaterThan(80);
    // 63 icons are nine full rows of seven: the last row is full (#350).
    await expect(
      dialog.locator('[role="radiogroup"][aria-labelledby="folder-style-icon"] input'),
    ).toHaveCount(63);
    // The arrow keys run on through the expanded icons (one radio name).
    await dialog.getByRole('radio', { name: 'Leaf', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('radio', { name: 'Bookmark', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Show fewer' }).click();
    await expect(more).toHaveCSS('visibility', 'hidden');
  });

  test('the dialog radio groups move with the arrow keys, Reset goes back to graphite', async ({
    page,
  }) => {
    await pickFolderMenuItem(page, READING, 'Color and icon…');
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
    await expectNoPins(page);

    await pickFolderMenuItem(page, READING, 'Pin to sidebar');
    await expect(pinned(page).getByRole('heading', { name: 'Pinned' })).toBeVisible();
    await expect(pinnedItems(page)).toHaveCount(1);
    await expect(pinnedItems(page).first()).toContainText(READING);

    await pickFolderMenuItem(page, READING, 'Unpin from sidebar');
    await expectNoPins(page);
  });

  test("unpins from the row's Unpin button (hover on desktop, always on touch) with Undo", async ({
    page,
  }) => {
    await pickFolderMenuItem(page, READING, 'Pin to sidebar');
    await expect(pinnedItems(page)).toHaveCount(1);
    const row = pinnedItems(page).first();
    const unpin = row.getByRole('button', { name: `Unpin ${READING}` });
    const actions = row.locator('.pinned__actions');
    if (!isCompact(page)) {
      await expect(actions).toHaveCSS('opacity', '0');
      await row.hover();
    }
    await expect(actions).toHaveCSS('opacity', '1');
    await unpin.click();
    await expectNoPins(page);

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
    if (!isCompact(page)) {
      await row.hover();
    }
    await row.getByRole('button', { name: `Unpin ${title}` }).click();
    await expectNoPins(page);
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

  /** The reorder line of a list (#315) in viewport px, or `null` while none is drawn. */
  interface DropLine {
    readonly top: number;
    readonly left: number;
    readonly width: number;
    readonly height: number;
  }
  const dropLine = (list: Locator): Promise<DropLine | null> =>
    list.evaluate((element): DropLine | null => {
      const view = element.ownerDocument.defaultView;
      const line = view?.getComputedStyle(element, '::after');
      if (!line) {
        return null;
      }
      if (!element.classList.contains('ui-drop-line--shown') || line.content === 'none') {
        return null;
      }
      const box = element.getBoundingClientRect();
      return {
        top: box.top + parseFloat(line.top) + parseFloat(line.marginTop),
        left: box.left + parseFloat(line.left),
        width: parseFloat(line.width),
        height: parseFloat(line.height),
      };
    });

  /**
   * The line is drawn (2px), centred on the row's background left to right (±1px) and in the gap
   * at `gapY` (±1.5px: half the 1px gap plus rounding).
   */
  async function expectLine(list: Locator, row: Locator, gapY: number): Promise<void> {
    await expect.poll(() => dropLine(list)).not.toBeNull();
    const line = await dropLine(list);
    const box = await row.boundingBox();
    if (!line || !box) {
      throw new Error('no reorder line or row box');
    }
    expect(line.height).toBeCloseTo(2, 1);
    expect(Math.abs(line.left + line.width / 2 - (box.x + box.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(line.width - box.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(line.top + line.height / 2 - gapY)).toBeLessThanOrEqual(1.5);
  }

  const folderList = (page: Page): Locator =>
    page.locator('app-sidebar ui-tree ul.ui-tree__list', {
      has: page.locator(':scope > .ui-tree__drop-slot'),
    });
  const pinnedList = (page: Page): Locator => pinned(page).locator('ul.pinned__list');

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
    test.skip(isCompact(page), 'the touch drag has its own tests below');
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
    // A line in the gap above Reading marks the place; the rows hold still (Notes stays as a faint
    // ghost one row tall where it was), so the section keeps its height and Tags does not move.
    const slot = page.locator('app-sidebar .ui-tree__drop-slot');
    await expect(slot).toHaveCount(1);
    await expect(slot).toContainText(NOTES);
    expect((await slot.boundingBox())?.y).toBeCloseTo(from.y, 0);
    expect((await slot.boundingBox())?.height).toBeCloseTo(from.height, 0);
    expect((await reading.boundingBox())?.y).toBeCloseTo(to.y, 0);
    await expectLine(folderList(page), reading, to.y);
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
    expect(await dropLine(page.locator('app-sidebar ui-tree ul.ui-tree__list').first())).toBeNull();
  });

  test('reorders pinned items by dragging (desktop)', async ({ page }) => {
    test.skip(isCompact(page), 'the touch drag has its own test below');
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
    expect((await slot.boundingBox())?.y).toBeCloseTo(from.y, 0);
    expect((await slot.boundingBox())?.height).toBeCloseTo(from.height, 0);
    // The line below Notes (the last row, so it straddles its bottom edge); Notes holds still.
    const notesRow = pinnedItems(page).filter({ hasText: NOTES });
    expect((await notesRow.boundingBox())?.y).toBeCloseTo(to.y, 0);
    await expectLine(pinnedList(page), notesRow, to.y + to.height);
    await expectStill(page, tagsTop);
    await page.mouse.up();

    await expect(pinnedItems(page).first()).toContainText(NOTES);
    expect(await dropLine(pinnedList(page))).toBeNull();
  });

  /** Centre of a locator's box. */
  const centre = async (locator: Locator): Promise<{ x: number; y: number }> => {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
  };
  /**
   * With the Pinned card always on the Library page (#315) the last folder sits where the
   * "Folder created" toast floats: dismiss it before a finger goes down.
   */
  async function dismissToast(page: Page): Promise<void> {
    await page.locator('ui-toast').getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator('ui-toast')).toHaveCount(0);
  }
  /** Rest longer than the touch drag delay (400 ms), shorter than the long press (500 ms). */
  const DRAG_REST_MS = 440;

  test.describe('touch reorder on a phone (#315)', () => {
    test.beforeEach(({ page }) => {
      test.skip(!isCompact(page), 'touch screens only; a mouse drags at once');
    });

    const notesRow = (page: Page) =>
      page.getByRole('treeitem', { name: new RegExp(`^${NOTES}\\b`) });
    const readingRow = (page: Page) =>
      page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) });

    test('a press, a short rest and a move drag a folder; the line shows, nothing jumps', async ({
      page,
    }) => {
      await createNotes(page);
      await dismissToast(page);
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
      // The line in the gap above Reading, which holds still.
      expect((await readingRow(page).boundingBox())?.y).toBeCloseTo(to?.y ?? 0, 0);
      await expectLine(folderList(page), readingRow(page), to?.y ?? 0);
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
      await dismissToast(page);
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
      await page.setViewportSize({ width: 360, height: 700 });
      await page.evaluate('window.scrollTo(0, 0)');
      const before = await folderNames(page);
      const start = await centre(readingRow(page));
      expect(await page.evaluate('window.scrollY')).toBe(0);
      expect(start.y).toBeLessThan(680);

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
      // The dragged row leaves the list while it moves: find Notes by its name.
      await expectLine(
        pinnedList(page),
        pinnedItems(page).filter({ hasText: NOTES }),
        (to?.y ?? 0) + (to?.height ?? 0),
      );
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

  test('turning Folder colors off shows every folder in graphite', async ({ page }) => {
    await chooseStyle(page, 'Clay', 'Star');
    await openSidebar(page);
    await expect(coloured(page, 'clay').first()).toBeVisible();

    // Folder colors live only in Appearance since #315.
    await openSettingsSection(page, 'Appearance');
    await settled(page);
    await page.getByRole('switch', { name: 'Folder colors' }).click();
    await expect(page.getByRole('switch', { name: 'Folder colors' })).not.toBeChecked();

    await backToTree(page);
    await expect(coloured(page, 'clay')).toHaveCount(0);
    await expect(coloured(page, 'graphite').first()).toBeVisible();
  });

  test('Settings › Library has no pinned or tags rows: they are managed in place (#315)', async ({
    page,
  }) => {
    await openSettingsSection(page, 'Library');
    await settled(page);
    await expect(page.getByRole('heading', { name: 'Trash', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit pinned' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Manage tags' })).toHaveCount(0);
    await expect(page.getByRole('switch', { name: 'Folder colors' })).toHaveCount(0);
  });
});

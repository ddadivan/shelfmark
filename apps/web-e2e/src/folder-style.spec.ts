import { type Locator, type Page } from '@playwright/test';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { openFeed, pickFolderMenuItem } from './support/a11y-flows';
import { openSettingsSection } from './support/mock-session';
import { gotoWithSidebar, isPhone, openSidebar, tabBar } from './support/sidebar';
import { settled } from './support/settled';
import { expect, test } from './support/test';

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
    test.skip(isPhone(page), 'a touch never starts a reorder drag');
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
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 8, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + 2, { steps: 10 });
    await expect(page.locator('app-sidebar .ui-tree__drop-line')).toHaveCount(1);
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
    await expect(page.locator('app-sidebar .ui-tree__drop-line')).toHaveCount(0);
  });

  test('reorders pinned items by dragging (desktop)', async ({ page }) => {
    test.skip(isPhone(page), 'a phone reorders with Alt+arrows or Settings › Edit pinned');
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
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 8, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height - 2, { steps: 10 });
    await page.mouse.up();

    await expect(pinnedItems(page).first()).toContainText(NOTES);
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

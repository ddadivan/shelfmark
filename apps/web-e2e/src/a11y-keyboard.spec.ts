import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { openFeed } from './support/a11y-flows';
import { activeOption, expectVisibleFocus, pressUntilFocused } from './support/keyboard';

const READING = 'Reading';
const DOCS = 'docs';
const NEW_URL = 'https://example.org/keyboard';
const ARCHIVE = 'Archive';
// The phone width of the layout (the `phone` project).
const PHONE_WIDTH = 360;
const PHONE_HEIGHT = 780;

/** Focuses the control with Tab, checks the indicator, then activates it with `key`. */
async function activate(page: Page, target: Locator, key = 'Enter') {
  await pressUntilFocused(page, target);
  await expectVisibleFocus(page);
  await page.keyboard.press(key);
}

/** After the page has loaded, every step below uses the keyboard only (Esc included). */
test.describe('keyboard-only flows (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'a phone has no keyboard; the desktop project covers it');

  const library = (page: Page) => page.getByRole('navigation', { name: 'Library' });
  const row = (page: Page, name: string) =>
    library(page).getByRole('treeitem', { name: new RegExp(`^${name}\\b`) });

  test('adds a link and focus returns to the trigger', async ({ page }) => {
    await openFeed(page);
    const trigger = page.getByRole('button', { name: 'Add link' }).first();

    await activate(page, trigger);
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Link', { exact: true })).toBeFocused();
    await expectVisibleFocus(page);

    await page.keyboard.type(NEW_URL);
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on example.org');
    await activate(page, dialog.getByRole('button', { name: 'Save link' }));

    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expectVisibleFocus(page);
  });

  test('Esc closes the add dialog and focus returns to the trigger', async ({ page }) => {
    await openFeed(page);
    const trigger = page.getByRole('button', { name: 'Add link' }).first();

    await activate(page, trigger);
    await expect(page.getByRole('dialog', { name: 'Add link' })).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expectVisibleFocus(page);
  });

  test('edits a link and focus returns to the card menu button', async ({ page }) => {
    await openFeed(page);
    const card = page.locator('ui-card').first();
    const actions = card.getByRole('button', { name: /^Actions for / });

    await activate(page, actions);
    await pressUntilFocused(page, page.getByRole('menuitem', { name: 'Edit' }), 'ArrowDown');
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Edit link' });
    await expect(dialog).toBeVisible();

    const title = dialog.getByLabel('Title', { exact: true });
    await pressUntilFocused(page, title);
    await expectVisibleFocus(page);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Renamed by keyboard');
    await activate(page, dialog.getByRole('button', { name: 'Save changes' }));

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Changes saved')).toBeVisible();
    await expect(page.locator('ui-card').first()).toContainText('Renamed by keyboard');
    await expect(
      page
        .locator('ui-card')
        .first()
        .getByRole('button', { name: /^Actions for / }),
    ).toBeFocused();
    await expectVisibleFocus(page);
  });

  test('deletes a link and brings it back with Undo, keyboard only', async ({ page }) => {
    await openFeed(page);
    const card = page.locator('ui-card').first();
    const title = await card.getByRole('heading').innerText();

    await activate(page, card.getByRole('button', { name: /^Actions for / }));
    await pressUntilFocused(page, page.getByRole('menuitem', { name: 'Edit' }), 'ArrowDown');
    await page.keyboard.press('Enter');
    const edit = page.getByRole('dialog', { name: 'Edit link' });
    await expect(edit).toBeVisible();

    await activate(page, edit.getByRole('button', { name: 'Delete' }));
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await activate(page, confirm.getByRole('button', { name: 'Delete' }));

    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
    // The card that opened the dialog is gone, so focus has nowhere to return to and falls back
    // to <body>; the browser keeps the removed card as the starting point of the next Tab.
    await expect(page.locator('body')).toBeFocused();
    // The toast sits at the end of the document: Shift+Tab from the deleted card wraps round to it.
    const undo = page.getByRole('button', { name: 'Undo' });
    await pressUntilFocused(page, undo, 'Shift+Tab');
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  });

  test('creates a folder and moves another into it', async ({ page }) => {
    await openFeed(page);

    await activate(page, library(page).getByRole('button', { name: 'New folder' }));
    const create = page.getByRole('dialog', { name: 'New folder' });
    await expect(create.getByLabel('Name')).toBeFocused();
    await page.keyboard.type(ARCHIVE);
    await activate(page, create.getByRole('button', { name: 'Create folder' }));
    await expect(create).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: ARCHIVE })).toBeVisible();

    // The tree has one tab stop (roving tabindex): Tab enters it, the arrows move inside.
    await pressUntilFocused(page, library(page).locator('[role="treeitem"][tabindex="0"]'));
    await pressUntilFocused(page, row(page, READING), 'ArrowDown');
    await expectVisibleFocus(page);
    await page.keyboard.press('Shift+F10');
    await pressUntilFocused(page, page.getByRole('menuitem', { name: 'Move to…' }), 'ArrowDown');
    await page.keyboard.press('Enter');
    const move = page.getByRole('dialog', { name: `Move “${READING}”` });
    await expect(move).toBeVisible();

    await pressUntilFocused(page, move.getByRole('combobox'));
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    const option = page.getByRole('option').filter({ hasText: ARCHIVE });
    await expect(option).toBeVisible();
    await activeOption(page, option);
    await page.keyboard.press('Enter');
    await activate(page, move.getByRole('button', { name: 'Move' }));

    await expect(move).toBeHidden();
    // Reading now sits in the collapsed Archive, so its row (the opener) is gone: focus moves to
    // its new parent row (#165) instead of falling to <body>, and Right expands it.
    await expect(row(page, READING)).toHaveCount(0);
    await expect(row(page, ARCHIVE)).toBeFocused();
    await expectVisibleFocus(page);
    await page.keyboard.press('ArrowRight');
    await expect(row(page, READING)).toBeVisible();
  });

  test('renames a folder: the field has focus and focus returns to the row', async ({ page }) => {
    await openFeed(page);

    await pressUntilFocused(page, library(page).locator('[role="treeitem"][tabindex="0"]'));
    await pressUntilFocused(page, row(page, READING), 'ArrowDown');
    await page.keyboard.press('Shift+F10');
    await pressUntilFocused(page, page.getByRole('menuitem', { name: 'Rename' }), 'ArrowDown');
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Rename folder' });
    await expect(dialog).toBeVisible();

    const field = dialog.getByLabel('Name');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue(READING);
    await expectVisibleFocus(page);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Library');
    await page.keyboard.press('Enter');

    await expect(dialog).toBeHidden();
    await expect(row(page, 'Library')).toBeFocused();
    await expectVisibleFocus(page);
  });

  test('renames a tag with the keyboard', async ({ page }) => {
    await openFeed(page);
    const chip = library(page).getByRole('button', { name: DOCS, exact: true });

    await pressUntilFocused(page, chip);
    await expectVisibleFocus(page);
    await page.keyboard.press('Shift+F10');
    await pressUntilFocused(page, page.getByRole('menuitem', { name: 'Rename' }), 'ArrowDown');
    await page.keyboard.press('Enter');

    const field = library(page).getByRole('textbox', { name: 'Tag name' });
    await expect(field).toBeFocused();
    await expectVisibleFocus(page);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('manuals');
    await page.keyboard.press('Enter');

    const renamed = library(page).getByRole('button', { name: 'manuals', exact: true });
    await expect(renamed).toBeVisible();
    await expect(library(page).getByRole('button', { name: DOCS, exact: true })).toHaveCount(0);
    await expect(renamed).toBeFocused();
    await expectVisibleFocus(page);
  });
});

test.describe('keyboard-only drawer (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'a phone has no keyboard; the desktop project covers it');
  test.use({ viewport: { width: PHONE_WIDTH, height: PHONE_HEIGHT } });

  test('reaches the drawer opener with Tab and returns focus on close', async ({ page }) => {
    await openFeed(page);
    const opener = page.getByRole('button', { name: 'Open menu' });

    await activate(page, opener);
    const drawer = page.getByRole('dialog', { name: 'Menu' });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(drawer).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expectVisibleFocus(page);
  });
});

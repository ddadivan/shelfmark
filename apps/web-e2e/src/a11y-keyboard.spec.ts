import { expect, test, type Page } from '@playwright/test';
import { openFeed } from './support/a11y-flows';
import { activeOption, arrowTo, expectVisibleFocus, tabTo } from './support/keyboard';
import { openSidebar } from './support/sidebar';

const READING = 'Reading';
const DOCS = 'docs';
const NEW_URL = 'https://example.org/keyboard';
const ARCHIVE = 'Archive';

/** Esc-free, mouse-free: every step below uses the keyboard only, after the page has loaded. */
test.describe('keyboard-only flows (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'a phone has no keyboard; the desktop project covers it');

  const library = (page: Page) => page.getByRole('navigation', { name: 'Library' });
  const row = (page: Page, name: string) =>
    library(page).getByRole('treeitem', { name: new RegExp(`^${name}\\b`) });

  /** Focuses the control with Tab, checks the indicator, then activates it with `key`. */
  async function activate(page: Page, target: ReturnType<Page['locator']>, key = 'Enter') {
    await tabTo(page, target);
    await expectVisibleFocus(page);
    await page.keyboard.press(key);
  }

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
    await arrowTo(page, page.getByRole('menuitem', { name: 'Edit' }));
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Edit link' });
    await expect(dialog).toBeVisible();

    const title = dialog.getByLabel('Title', { exact: true });
    await tabTo(page, title);
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
    await arrowTo(page, page.getByRole('menuitem', { name: 'Edit' }));
    await page.keyboard.press('Enter');
    const edit = page.getByRole('dialog', { name: 'Edit link' });
    await expect(edit).toBeVisible();

    await activate(page, edit.getByRole('button', { name: 'Delete' }));
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await activate(page, confirm.getByRole('button', { name: 'Delete' }));

    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
    // The toast sits at the end of the document: Shift+Tab from the deleted card wraps round to it.
    const undo = page.getByRole('button', { name: 'Undo' });
    await tabTo(page, undo, { reverse: true });
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
    await tabTo(page, library(page).locator('[role="treeitem"][tabindex="0"]'));
    await arrowTo(page, row(page, READING));
    await expectVisibleFocus(page);
    await page.keyboard.press('Shift+F10');
    await arrowTo(page, page.getByRole('menuitem', { name: 'Move to…' }));
    await page.keyboard.press('Enter');
    const move = page.getByRole('dialog', { name: `Move “${READING}”` });
    await expect(move).toBeVisible();

    await tabTo(page, move.getByRole('combobox'));
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    const option = page.getByRole('option').filter({ hasText: ARCHIVE });
    await expect(option).toBeVisible();
    await activeOption(page, option);
    await page.keyboard.press('Enter');
    await activate(page, move.getByRole('button', { name: 'Move' }));

    await expect(move).toBeHidden();
    // Reading now sits in the collapsed Archive, so its row (the opener) is gone and focus has no
    // element to return to; the keyboard path on is Tab into the tree, then Right to expand.
    await expect(row(page, READING)).toHaveCount(0);
    await tabTo(page, library(page).locator('[role="treeitem"][tabindex="0"]'));
    await arrowTo(page, row(page, ARCHIVE));
    await expectVisibleFocus(page);
    await page.keyboard.press('ArrowRight');
    await expect(row(page, READING)).toBeVisible();
  });

  test('renames a tag with the keyboard', async ({ page }) => {
    await openFeed(page);
    const chip = library(page).getByRole('button', { name: DOCS, exact: true });

    await tabTo(page, chip);
    await expectVisibleFocus(page);
    await page.keyboard.press('Shift+F10');
    await arrowTo(page, page.getByRole('menuitem', { name: 'Rename' }));
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

  test('reaches the phone drawer opener with Tab and returns focus on close', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await openFeed(page);
    const opener = page.getByRole('button', { name: 'Open menu' });

    await activate(page, opener);
    const drawer = page.getByRole('dialog', { name: 'Menu' });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(drawer).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expectVisibleFocus(page);
    await openSidebar(page);
  });
});

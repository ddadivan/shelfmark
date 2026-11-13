import { type Locator, type Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { openFeed, pickFolderMenuItem } from './support/a11y-flows';
import { isPhone, openSidebar } from './support/sidebar';
import { expect, test } from './support/test';

const READING = MOCK_FIXTURE.readingName;

// The emoji picker of the folder style dialog (#363). Its keyboard, search and removal logic is
// covered by emoji-picker.component.spec.ts and folder-actions.style.spec.ts; these are the
// journeys a browser lays out: the panel opens, finds, chooses and saves; an own emoji shows
// under Yours and is removed with Undo; on a phone the panel is a bottom sheet.
test.describe('folder emoji picker (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await openFeed(page);
  });

  async function openStyle(page: Page): Promise<Locator> {
    await pickFolderMenuItem(page, READING, 'Color and icon…');
    const dialog = page.getByRole('dialog', { name: READING });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  const emojiField = (dialog: Locator): Locator =>
    dialog.getByRole('combobox', { name: 'Emoji', exact: true });
  const panel = (page: Page): Locator => page.getByRole('dialog', { name: 'Emoji', exact: true });

  async function openPicker(page: Page, dialog: Locator): Promise<Locator> {
    await emojiField(dialog).click();
    const picker = panel(page);
    await expect(picker).toBeVisible();
    // The names load as a lazy chunk on the first open.
    await expect(picker.getByRole('tab').first()).toBeVisible();
    return picker;
  }

  async function save(dialog: Locator): Promise<void> {
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);
  }

  const readingEmoji = (page: Page): Locator =>
    page
      .getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) })
      .locator('.ui-folder-icon__emoji');

  test('searches, chooses with the keyboard and saves the emoji on the folder', async ({
    page,
  }) => {
    const dialog = await openStyle(page);
    await expect(emojiField(dialog)).toHaveAttribute('placeholder', 'Choose an emoji');
    const picker = await openPicker(page, dialog);

    // The search box has focus; nine category tabs, the second shows travel emoji.
    const search = picker.getByRole('textbox', { name: 'Search emoji' });
    await expect(search).toBeFocused();
    await expect(picker.getByRole('tab')).toHaveCount(9);
    await picker.getByRole('tab', { name: 'Travel' }).click();
    await expect(picker.getByRole('gridcell', { name: 'airplane' })).toBeVisible();

    // Arrows move from the search box into the results, Enter chooses.
    await search.fill('pizza');
    await expect(picker.getByRole('heading', { name: 'Results' })).toBeVisible();
    await expect(picker.getByRole('gridcell').first()).toHaveAccessibleName('pizza');
    await search.press('ArrowDown');
    await expect(picker.getByRole('gridcell', { name: 'pizza' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(panel(page)).toHaveCount(0);
    await expect(emojiField(dialog)).toHaveValue('🍕');
    await expect(emojiField(dialog)).toBeFocused();
    await save(dialog);

    await openSidebar(page);
    await expect(readingEmoji(page)).toHaveText('🍕');
    // The emoji is recent now, on top of the next open.
    const again = await openStyle(page);
    const reopened = await openPicker(page, again);
    await expect(reopened.getByRole('heading', { level: 3 }).first()).toHaveText('Recent');
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    // Esc closed only the picker; the style dialog stays.
    await expect(again).toBeVisible();
  });

  test('keeps a typed emoji the collection lacks under Yours and removes it with Undo', async ({
    page,
  }) => {
    let dialog = await openStyle(page);
    await emojiField(dialog).fill('🦩');
    await save(dialog);
    await openSidebar(page);
    await expect(readingEmoji(page)).toHaveText('🦩');

    // Worn by Reading: under Yours, but not removable. Switch the folder to a listed emoji.
    dialog = await openStyle(page);
    let picker = await openPicker(page, dialog);
    const yours = picker.getByRole('grid', { name: 'Yours' });
    await expect(yours.getByRole('gridcell', { name: '🦩' })).toBeVisible();
    await expect(yours.getByRole('gridcell', { name: '🦩' })).not.toHaveAttribute(
      'aria-description',
      /.+/,
    );
    await picker.getByRole('gridcell', { name: 'pizza' }).click();
    await save(dialog);

    // Now it can go: the "×" shows on hover, Delete removes it, the toast offers Undo.
    dialog = await openStyle(page);
    picker = await openPicker(page, dialog);
    const own = picker.getByRole('grid', { name: 'Yours' }).getByRole('gridcell', { name: '🦩' });
    await expect(own).toHaveAttribute('aria-description', 'Remove emoji 🦩');
    await own.hover();
    await expect(own.locator('.ui-emoji-picker__remove')).toHaveCSS('opacity', '1');
    await own.focus();
    await page.keyboard.press('Delete');
    await expect(picker.getByRole('grid', { name: 'Yours' })).toHaveCount(0);

    const toast = page.locator('ui-toast').filter({ hasText: 'Emoji removed' });
    await expect(toast).toContainText('🦩');
    // A press outside the picker (the toast) closes it; Undo brings the emoji back.
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(panel(page)).toHaveCount(0);
    picker = await openPicker(page, dialog);
    await expect(
      picker.getByRole('grid', { name: 'Yours' }).getByRole('gridcell', { name: '🦩' }),
    ).toBeVisible();
  });

  test(
    'is a bottom sheet on a phone and saves the chosen emoji',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      test.skip(!isPhone(page), 'the sheet is the phone layout; desktop has the tests above');
      const dialog = await openStyle(page);
      const picker = await openPicker(page, dialog);

      // Full width at the bottom edge, above the style sheet.
      const viewport = page.viewportSize();
      // After the slide-in (320 ms).
      await expect
        .poll(async () => {
          const box = await picker.boundingBox();
          return [Math.round(box?.width ?? 0), Math.round((box?.y ?? 0) + (box?.height ?? 0))];
        })
        .toEqual([viewport?.width, viewport?.height]);
      // The keyboard stays closed: the panel, not the search box, has focus.
      await expect(picker).toBeFocused();

      await picker.getByRole('tab', { name: 'Animals' }).click();
      await picker.getByRole('gridcell', { name: 'dog face' }).click();
      await expect(panel(page)).toHaveCount(0);
      await expect(emojiField(dialog)).toHaveValue('🐶');
      await save(dialog);
    },
  );
});

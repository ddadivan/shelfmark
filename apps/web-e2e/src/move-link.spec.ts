import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { switchView } from './support/library-toolbar';
import { isCompact } from './support/sidebar';
import { settled } from './support/settled';
import { E2E_TAG } from './models/e2e-tag.const';

// Mirror MOCK_LINKS ("Simple pasta" is unsorted), MOCK_NAME.FolderReading and FolderAngular
// (libs/shared/contracts); the e2e project cannot import from them. Angular sits inside Reading.
const PASTA = 'Simple pasta';
const READING = 'Reading';
const ANGULAR = 'Angular';
const ANGULAR_PATH = `${READING} / ${ANGULAR}`;

async function openMovePicker(page: Page, item: 'ui-card' | 'ui-list-item'): Promise<Locator> {
  const trigger = page
    .locator(item)
    .filter({ hasText: PASTA })
    .getByRole('button', { name: /^Actions for / });
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Move to folder…' }).click();
  const picker = page.getByRole('dialog', { name: `Move “${PASTA}”` });
  await expect(picker).toBeVisible();
  await settled(page);
  return picker;
}

const folderOption = (picker: Locator, name: string): Locator =>
  picker.getByRole('option', { name, exact: true });

test.describe('move a link to a folder (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/unsorted');
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
  });

  test('choosing a folder in the picker moves the card at once, toasts, and Undo brings it back', async ({
    page,
  }) => {
    const picker = await openMovePicker(page, 'ui-card');
    // No form: no select, no Move button.
    await expect(picker.getByRole('combobox', { name: 'Folder', exact: true })).toHaveCount(0);
    await expect(picker.getByRole('button', { name: 'Move', exact: true })).toHaveCount(0);

    await folderOption(picker, READING).click();

    await expect(picker).toBeHidden();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);
    const toast = page.getByRole('status').filter({ hasText: `Moved to ${READING}` });
    await expect(toast).toContainText(PASTA);

    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
  });

  test('works from a row in the list view', async ({ page }) => {
    await switchView(page, 'List');
    const picker = await openMovePicker(page, 'ui-list-item');
    await folderOption(picker, READING).click();

    await expect(page.getByText(PASTA, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: `Moved to ${READING}` })).toBeVisible();
  });

  test('lists Unsorted and the nested folders, and marks the current folder, which cannot be chosen', async ({
    page,
  }) => {
    const picker = await openMovePicker(page, 'ui-card');
    await expect(picker.getByRole('listbox', { name: 'Folders' })).toBeVisible();
    // The link is in Unsorted: marked, aria-disabled, and a click changes nothing.
    const current = folderOption(picker, 'Unsorted, Current folder');
    await expect(current).toHaveAttribute('aria-disabled', 'true');
    await expect(current).toContainText('Current folder');
    // `force`: Playwright would wait for an aria-disabled row to become enabled.
    await current.click({ force: true });
    await expect(picker).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Moved to' })).toHaveCount(0);
    // Nested rows are named by their path.
    await expect(folderOption(picker, READING)).toBeVisible();
    await expect(folderOption(picker, ANGULAR_PATH)).toBeVisible();
  });

  test('the search filters by name and keeps the ancestors of a match', async ({ page }) => {
    const picker = await openMovePicker(page, 'ui-card');
    await picker.getByRole('combobox', { name: 'Search folders' }).fill('angul');

    await expect(folderOption(picker, ANGULAR_PATH)).toBeVisible();
    await expect(folderOption(picker, READING)).toBeVisible();
    await expect(picker.getByRole('option', { name: /Unsorted/ })).toHaveCount(0);

    await picker.getByRole('combobox', { name: 'Search folders' }).fill('zzzz');
    await expect(picker.getByRole('option')).toHaveCount(0);
    await expect(picker.getByRole('status')).toHaveText('No folders found');

    await picker.getByRole('combobox', { name: 'Search folders' }).fill('angul');
    await folderOption(picker, ANGULAR_PATH).click();
    await expect(
      page.getByRole('status').filter({ hasText: `Moved to ${ANGULAR_PATH}` }),
    ).toBeVisible();
  });

  test('the close button keeps the link where it was', async ({ page }) => {
    const picker = await openMovePicker(page, 'ui-card');
    await picker.getByRole('button', { name: 'Close' }).click();

    await expect(picker).toBeHidden();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Moved to' })).toHaveCount(0);
  });

  test('Esc closes the picker and focus returns to the trigger', async ({ page }) => {
    const picker = await openMovePicker(page, 'ui-card');
    await page.keyboard.press('Escape');

    await expect(picker).toBeHidden();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
    await expect(
      page
        .locator('ui-card')
        .filter({ hasText: PASTA })
        .getByRole('button', { name: /^Actions for / }),
    ).toBeFocused();
  });

  test(
    'is a centred dialog on desktop and a bottom sheet below 64em',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      const picker = await openMovePicker(page, 'ui-card');
      const panel = picker.locator('.ui-dialog');
      const box = await panel.boundingBox();
      const viewport = page.viewportSize();
      if (!box || !viewport) {
        throw new Error('no layout');
      }
      if (isCompact(page)) {
        await expect(panel).toHaveClass(/ui-dialog--sheet/);
        expect(Math.round(box.y + box.height)).toBe(viewport.height);
        // A tablet sheet is a centred 560px column; a phone sheet spans the screen.
        expect(Math.round(box.width)).toBe(Math.min(560, viewport.width));
      } else {
        expect(box.y + box.height).toBeLessThan(viewport.height - 40);
        expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
      }
    },
  );

  test.describe('keyboard', () => {
    test.skip(({ isMobile }) => isMobile, 'touch screens do not start in the search box');

    test('focus starts in the search, ArrowDown enters the list, Enter chooses', async ({
      page,
    }) => {
      const picker = await openMovePicker(page, 'ui-card');
      const search = picker.getByRole('combobox', { name: 'Search folders' });
      await expect(search).toBeFocused();
      await expect(search).not.toHaveAttribute('aria-activedescendant', /.+/);

      // Unsorted is the current folder (focusable, not choosable), then Reading, then Angular.
      await page.keyboard.press('ArrowDown');
      await expect(folderOption(picker, 'Unsorted, Current folder')).toHaveAttribute(
        'data-active',
        'true',
      );
      await page.keyboard.press('ArrowDown');
      await expect(folderOption(picker, READING)).toHaveAttribute('data-active', 'true');
      await page.keyboard.press('End');
      await expect(folderOption(picker, ANGULAR_PATH)).toHaveAttribute('data-active', 'true');
      await page.keyboard.press('Home');
      await expect(folderOption(picker, 'Unsorted, Current folder')).toHaveAttribute(
        'data-active',
        'true',
      );
      await page.keyboard.press('ArrowDown');
      await expect(search).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(picker).toBeHidden();
      await expect(
        page.getByRole('status').filter({ hasText: `Moved to ${READING}` }),
      ).toBeVisible();
    });

    test('typing then Enter moves to the first match', async ({ page }) => {
      const picker = await openMovePicker(page, 'ui-card');
      await page.keyboard.type('angul');
      await page.keyboard.press('Enter');
      // The first match is the ancestor Reading, so Enter chooses it.
      await expect(picker).toBeHidden();
      await expect(
        page.getByRole('status').filter({ hasText: `Moved to ${READING}` }),
      ).toBeVisible();
    });

    test('Enter without entering the list does not move anything', async ({ page }) => {
      const picker = await openMovePicker(page, 'ui-card');
      await page.keyboard.press('Enter');
      await expect(picker).toBeVisible();
    });
  });
});

import type { Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';
import {
  addLinkWith,
  AI_TITLE,
  AI_URL,
  AI_WAIT,
  cardOf,
  saveLink,
  seedAi,
  tagSuggestions,
} from './support/ai';

const FILL = 'Fill in with AI';

async function openLinks(page: Page): Promise<void> {
  await seedAi(page);
  await seedSession(page);
  await page.goto('/links');
  await expect(page.locator('ui-card').first()).toBeVisible();
}

test.describe('Fill in with AI (F1c, #499, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test(
    'one press applies the folder and the existing tag; the new tag stays a chip',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openLinks(page);
      const dialog = await addLinkWith(page, AI_URL);
      const fill = dialog.getByRole('button', { name: FILL });
      await expect(fill).toBeVisible(AI_WAIT);
      await fill.click();

      await expect(dialog.getByRole('combobox', { name: 'Folder' })).toContainText('Angular');
      await expect(dialog.getByRole('button', { name: 'Remove tag docs' })).toBeVisible();
      // The new tag is never created by the press: it stays a suggestion.
      await expect(
        tagSuggestions(dialog).getByRole('button', { name: 'Create and add tag example' }),
      ).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Remove tag example' })).toHaveCount(0);
      await expect(fill).toHaveCount(0);
      // Ordinary values: no "Moved by AI" mark.
      await expect(dialog).not.toContainText('Moved by AI');

      await saveLink(dialog);
      await expect(cardOf(page, AI_TITLE)).toContainText('docs');
    },
  );

  test('Alt+Shift+F fills in from the keyboard and is listed with the shortcuts', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'a desktop keyboard shortcut');
    await openLinks(page);
    const dialog = await addLinkWith(page, AI_URL);
    await expect(dialog.getByRole('button', { name: FILL })).toBeVisible(AI_WAIT);
    await dialog.getByLabel('Title', { exact: true }).focus();
    await page.keyboard.press('Alt+Shift+KeyF');
    await expect(dialog.getByRole('combobox', { name: 'Folder' })).toContainText('Angular');
    await expect(dialog.getByRole('button', { name: 'Remove tag docs' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    await expect(
      page
        .getByRole('dialog', { name: 'Keyboard shortcuts' })
        .getByText('Fill in with AI in the link dialog'),
    ).toBeVisible();
  });
});

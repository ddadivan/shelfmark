import type { Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';
import {
  addLinkWith,
  AI_TITLE,
  AI_URL,
  AI_SUMMARY,
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
    'one press fills the folder, all tags (new ones too) and the summary; the note stays yours',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openLinks(page);
      const dialog = await addLinkWith(page, AI_URL);
      const fill = dialog.getByRole('button', { name: FILL });
      await expect(fill).toBeVisible(AI_WAIT);
      await fill.click();

      await expect(dialog.getByRole('combobox', { name: 'Folder' })).toContainText('Angular');
      await expect(dialog.getByRole('button', { name: 'Remove tag docs' })).toBeVisible();
      // The new tag goes in too; its dashed chip is gone.
      await expect(dialog.getByRole('button', { name: 'Remove tag example' })).toBeVisible();
      await expect(
        tagSuggestions(dialog).getByRole('button', { name: 'Create and add tag example' }),
      ).toHaveCount(0);
      // The summary field appears with AI's text; the note is untouched.
      await expect(dialog.getByLabel('Summary')).toHaveValue(AI_SUMMARY);
      await expect(dialog.getByLabel('Your note')).toHaveValue('');
      // Ordinary values: no "Moved by AI" mark.
      await expect(dialog).not.toContainText('Moved by AI');

      await saveLink(dialog);
      const card = cardOf(page, AI_TITLE);
      await expect(card).toContainText('docs');
      await expect(card).toContainText('example');
    },
  );

  test(
    'is inactive until a link is pasted, then fills a video address from the user own folder and tags',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      // The demo library has a Videos folder and a "video" tag.
      await page.addInitScript(() => sessionStorage.setItem('sm-mock-links-scenario', 'showcase'));
      await openLinks(page);
      await page.getByRole('button', { name: 'Add link' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      const fill = dialog.getByRole('button', { name: FILL });
      await expect(fill).toHaveAttribute('aria-disabled', 'true');
      // Focusable (not natively disabled): the tooltip stays readable.
      await expect(fill).not.toHaveAttribute('disabled', '');
      await expect(dialog).toContainText('Paste a link first', { useInnerText: false });

      await dialog
        .getByLabel('Link', { exact: true })
        .fill('https://www.youtube.com/watch?v=abc123');
      await expect(fill).not.toHaveAttribute('aria-disabled', 'true');
      // The due-reminder toast of the demo library may float over the footer.
      const dismiss = page.getByRole('button', { name: 'Dismiss' });
      if (await dismiss.count()) {
        await dismiss.first().click();
      }
      await fill.click();
      await expect(dialog.getByRole('combobox', { name: 'Folder' })).toContainText(
        'Videos',
        AI_WAIT,
      );
      await expect(dialog.getByRole('button', { name: 'Remove tag video' })).toBeVisible();
      await expect(dialog.getByLabel('Summary')).not.toHaveValue('');
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

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Keyboard shortcuts' }).click();
    await expect(
      page
        .getByRole('dialog', { name: 'Keyboard shortcuts' })
        .getByText('Fill in with AI in the link dialog'),
    ).toBeVisible();
  });
});

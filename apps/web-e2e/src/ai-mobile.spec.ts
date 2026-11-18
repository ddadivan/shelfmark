import type { Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { isCompact, isPhone } from './support/sidebar';
import { E2E_TAG } from './models/e2e-tag.const';
import {
  addLinkWith,
  AI_DISCLAIMER,
  AI_SUMMARY,
  AI_TITLE,
  AI_URL,
  AI_WAIT,
  cardOf,
  openAiSettings,
  saveLink,
  seedAi,
  tagSuggestions,
} from './support/ai';

async function openLinks(page: Page): Promise<void> {
  await seedSession(page);
  await page.goto('/links');
  await expect(page.locator('ui-card').first()).toBeVisible();
}

test.describe('AI in the mobile shell (#389, mock API)', { tag: E2E_TAG.Mobile }, () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('You › AI turns AI on and picks a folder mode', async ({ page }) => {
    test.skip(!isCompact(page), 'desktop opens Settings › AI from the account menu (ai.spec.ts)');
    await openLinks(page);
    await openAiSettings(page);

    await page.getByRole('switch', { name: 'Use AI in Shelfmark' }).click();
    const intro = page.getByRole('dialog', { name: /^Turn on AI/ });
    await intro.getByRole('button', { name: 'Turn on AI' }).click();
    await expect(intro).toBeHidden();
    await expect(page.getByRole('switch', { name: 'Use AI in Shelfmark' })).toBeChecked();

    if (isPhone(page)) {
      // A row per part opens its full-label choices (MobileAi state 7).
      await page.getByRole('link', { name: 'Folder: Suggest' }).click();
      const modes = page.getByRole('radiogroup', { name: 'Folder suggestions' });
      // The label covers the visually hidden input: tap its text, as a person would.
      await modes.getByText('Apply automatically when I don’t choose').click();
      await expect(modes.getByRole('radio', { name: /^Apply automatically/ })).toBeChecked();
      await page.getByRole('link', { name: 'AI' }).click();
      await expect(page.getByRole('link', { name: 'Folder: Automatic' })).toBeVisible();
    } else {
      const folder = page.getByRole('radiogroup', { name: 'Folder' });
      await folder.getByRole('radio', { name: 'Automatic' }).click();
      await expect(folder.getByRole('radio', { name: 'Automatic' })).toBeChecked();
    }
  });

  test('the Add link sheet shows suggestion chips and the summary lands on the card', async ({
    page,
  }) => {
    await seedAi(page);
    await openLinks(page);
    const dialog = await addLinkWith(page, AI_URL);

    const tags = tagSuggestions(dialog);
    await tags.getByRole('button', { name: 'Add tag docs' }).click(AI_WAIT);
    await expect(dialog.getByRole('button', { name: 'Remove tag docs' })).toBeVisible();
    await saveLink(dialog);

    const card = cardOf(page, AI_TITLE);
    await expect(card).toContainText(AI_SUMMARY, AI_WAIT);
    await expect(card.getByRole('img', { name: AI_DISCLAIMER })).toBeVisible();
  });
});

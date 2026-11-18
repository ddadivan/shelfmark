import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import {
  addLinkWith,
  AI_DISCLAIMER,
  AI_SUMMARY,
  AI_TITLE,
  AI_URL,
  AI_WAIT,
  backToLinks,
  cardOf,
  MOCK_AI_URL,
  openAiSettings,
  saveLink,
  seedAi,
  tagSuggestions,
} from './support/ai';
import type { Page } from '@playwright/test';

/** Signed in on All links; with `ai`, the mock account has AI on (intro seen). */
async function openLinks(page: Page, ai = true): Promise<void> {
  if (ai) {
    await seedAi(page);
  }
  await seedSession(page);
  await page.goto('/links');
  await expect(page.locator('ui-card').first()).toBeVisible();
}

/** Saves `AI_URL` from Add link and waits until the card shows the AI summary. */
async function saveWithSummary(page: Page): Promise<void> {
  const dialog = await addLinkWith(page, AI_URL);
  await saveLink(dialog);
  await expect(cardOf(page, AI_TITLE)).toContainText(AI_SUMMARY, AI_WAIT);
}

test.describe('AI (#389, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('Settings › AI turns AI on through the intro dialog, "Not now" leaves it off', async ({
    page,
  }) => {
    await openLinks(page, false);
    await openAiSettings(page);
    const main = page.getByRole('switch', { name: 'Use AI in Shelfmark' });
    await expect(main).not.toBeChecked();
    await expect(page.getByRole('heading', { name: 'This month' })).toHaveCount(0);

    await main.click();
    const intro = page.getByRole('dialog', { name: 'Turn on AI in Shelfmark?' });
    await expect(intro.getByText('Not used for training')).toBeVisible();
    await intro.getByRole('button', { name: 'Not now' }).click();
    await expect(intro).toBeHidden();
    await expect(main).not.toBeChecked();

    await main.click();
    await intro.getByRole('button', { name: 'Turn on AI' }).click();
    await expect(intro).toBeHidden();
    await expect(main).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Summaries' })).toBeChecked();
    await expect(page.getByRole('heading', { name: 'This month' })).toBeVisible();
  });

  test('Add link suggests a folder and tags: a chip is taken, another dismissed', async ({
    page,
  }) => {
    await openLinks(page);
    const dialog = await addLinkWith(page, AI_URL);

    const tags = tagSuggestions(dialog);
    await expect(tags.getByRole('button', { name: 'Add tag docs' })).toBeVisible(AI_WAIT);
    await expect(tags.getByRole('button', { name: 'Create and add tag example' })).toBeVisible();
    const folder = dialog.getByRole('toolbar', { name: 'Suggested folder' });
    await expect(folder.getByRole('button', { name: 'Move to Angular' })).toBeVisible();

    await tags.getByRole('button', { name: 'Add tag docs' }).click();
    await expect(dialog.getByRole('button', { name: 'Remove tag docs' })).toBeVisible();
    await expect(tags.getByRole('button', { name: 'Add tag docs' })).toHaveCount(0);

    await tags.getByRole('button', { name: 'Dismiss suggestion example' }).click();
    await expect(tags).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Remove tag example' })).toHaveCount(0);

    await folder.getByRole('button', { name: 'Move to Angular' }).click();
    await expect(dialog.getByRole('combobox', { name: 'Folder' })).toContainText('Angular');
    await expect(folder).toHaveCount(0);

    await saveLink(dialog);
    await expect(cardOf(page, AI_TITLE)).toContainText('docs');
  });

  test('saving without waiting for suggestions still brings the summary to the card', async ({
    page,
  }) => {
    await openLinks(page);
    const dialog = await addLinkWith(page, AI_URL);
    // The suggestions are still on their way (the row says "Suggesting…").
    await saveLink(dialog);

    const card = cardOf(page, AI_TITLE);
    await expect(card).toContainText(AI_SUMMARY, AI_WAIT);
    await expect(card.getByRole('img', { name: AI_DISCLAIMER })).toBeVisible();
  });

  test('an edit of the summary in Edit link makes it "Edited by you"', async ({ page }) => {
    await openLinks(page);
    await saveWithSummary(page);

    const card = cardOf(page, AI_TITLE);
    await card.getByRole('button', { name: `Actions for ${AI_TITLE}` }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit link' });
    const summary = edit.getByLabel('Summary', { exact: true });
    await expect(summary).toHaveValue(AI_SUMMARY);
    await expect(edit.getByText('Written by AI')).toBeVisible();
    await expect(edit.getByRole('button', { name: 'Rewrite' })).toBeVisible();

    await summary.fill('Angular docs to read before the workshop.');
    await expect(edit.getByText('Edited by you')).toBeVisible();
    await expect(edit.getByText('Written by AI')).toHaveCount(0);
    await expect(edit.getByRole('button', { name: 'Rewrite' })).toHaveCount(0);

    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(edit).toBeHidden();
    await expect(card).toContainText('Angular docs to read before the workshop.');
    await expect(card.getByRole('img', { name: AI_DISCLAIMER })).toHaveCount(0);
  });

  test('Automatic folder mode moves an unsorted link, and the toast puts it back', async ({
    page,
  }) => {
    await seedAi(page, { folderMode: 'auto' });
    await openLinks(page, false);
    const dialog = await addLinkWith(page, AI_URL);
    await expect(tagSuggestions(dialog)).toBeVisible(AI_WAIT);
    await saveLink(dialog);

    const toast = page.locator('ui-toast').filter({ hasText: 'Moved to Angular by AI' });
    await expect(toast).toBeVisible(AI_WAIT);
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(toast).toBeHidden();

    await cardOf(page, AI_TITLE)
      .getByRole('button', { name: `Actions for ${AI_TITLE}` })
      .click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit link' });
    await expect(edit.getByRole('combobox', { name: 'Folder' })).toContainText('Unsorted');
    await expect(edit.getByText('Moved by AI')).toHaveCount(0);
  });

  test('at the monthly limit Add link shows the limit line with a way to the settings', async ({
    page,
  }) => {
    await openLinks(page);
    const dialog = await addLinkWith(page, MOCK_AI_URL.quota);

    await expect(dialog.getByText(/^Suggestions are paused until .+ links\.$/)).toBeVisible(
      AI_WAIT,
    );
    await expect(tagSuggestions(dialog)).toHaveCount(0);
    await dialog.getByRole('button', { name: 'AI settings' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'AI' })).toBeVisible();
  });

  test('"not available" offers Try again once, and the link still saves', async ({ page }) => {
    await openLinks(page);
    const dialog = await addLinkWith(page, MOCK_AI_URL.fail);
    const line = dialog.getByText(
      'Suggestions aren’t available right now. Your link saves as usual.',
    );

    await expect(line).toBeVisible(AI_WAIT);
    await dialog.getByRole('button', { name: 'Try again' }).click();
    await expect(dialog.getByRole('button', { name: 'Try again' })).toHaveCount(0, AI_WAIT);
    await expect(line).toBeVisible(AI_WAIT);

    await saveLink(dialog);
    await expect(cardOf(page, 'Page on example.org')).toBeVisible();
  });

  test('Delete AI data removes the AI summaries after a confirmation', async ({ page }) => {
    await openLinks(page);
    await saveWithSummary(page);

    await openAiSettings(page);
    await page.getByRole('button', { name: 'Delete AI data' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Delete AI data?' });
    await confirm.getByRole('button', { name: 'Delete AI data' }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText('AI data deleted')).toBeVisible();

    await backToLinks(page);
    const card = cardOf(page, AI_TITLE);
    await expect(card).toBeVisible();
    await expect(card).not.toContainText(AI_SUMMARY);
  });
});

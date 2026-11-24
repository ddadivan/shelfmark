import { type Locator, type Page } from '@playwright/test';
import { openFeed } from './support/a11y-flows';
import { AI_DISCLAIMER, seedAi } from './support/ai';
import { E2E_TAG } from './models/e2e-tag.const';
import { openSaveThisView } from './support/library-toolbar';
import { expect, test } from './support/test';

// "+ Save view" (#535): one dialog for everyone, a phrase step while AI is on (mock API).
test.describe('new view dialog (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  const views = (page: Page): Locator => page.getByRole('toolbar', { name: 'Saved views' });
  const spark = (dialog: Locator): Locator => dialog.getByRole('img', { name: AI_DISCLAIMER });

  const type = (dialog: Locator): Locator => dialog.getByRole('combobox', { name: 'Type' });

  async function chooseType(page: Page, dialog: Locator, name: string): Promise<void> {
    await type(dialog).click();
    await page.getByRole('option', { name, exact: true }).click();
    await expect(type(dialog)).toContainText(name);
  }

  async function openDialog(page: Page): Promise<Locator> {
    await openSaveThisView(page);
    const dialog = page.getByRole('dialog', { name: 'New view' });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  // A core journey whose dialog is a bottom sheet in the mobile shell (frame C).
  test(
    'without AI: change the rows, watch the count, save, the chip appears',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openFeed(page);
      const dialog = await openDialog(page);
      await expect(dialog.getByRole('textbox', { name: 'Describe what to show' })).toHaveCount(0);
      await expect(dialog.getByText(/Found \d+ links?/u)).toBeVisible();

      await chooseType(page, dialog, 'Video');
      await dialog.getByRole('combobox', { name: 'Where' }).click();
      await page.getByRole('option', { name: 'Favorites' }).click();
      await expect(dialog.getByRole('combobox', { name: 'Where' })).toContainText('Favorites');

      // An empty view is allowed: the count says 0 and Save stays on.
      await dialog.getByRole('textbox', { name: 'Search words' }).fill('zzzzqqqq');
      await expect(dialog.getByText('Found 0 links')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Save view' })).toBeEnabled();

      await dialog.getByRole('textbox', { name: 'Name' }).fill('Starred videos');
      await dialog.getByRole('button', { name: 'Save view' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByText('View saved')).toBeVisible();
      await expect(
        views(page).getByRole('button', { name: /^Starred videos \d+$/u }),
      ).toBeVisible();
    },
  );

  test(
    'with AI: a phrase fills the rows with sparks; changing a row drops its spark',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedAi(page);
      await openFeed(page);
      const dialog = await openDialog(page);
      const phrase = dialog.getByRole('textbox', { name: 'Describe what to show' });
      await expect(phrase).toBeFocused();
      await phrase.fill('videos, newest first');
      await dialog.getByRole('button', { name: 'Compose' }).click();

      await expect(type(dialog)).toContainText('Video', { timeout: 10_000 });
      await expect(spark(dialog)).toHaveCount(3);
      await expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue(
        'Videos, newest first',
      );

      await chooseType(page, dialog, 'Article');
      await expect(spark(dialog)).toHaveCount(2);

      await dialog.getByRole('button', { name: 'Save view' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(
        views(page).getByRole('button', { name: /^Videos, newest first \d+$/u }),
      ).toBeVisible();
    },
  );

  // #537: the type select lists all ten kinds; a view of a new kind filters the feed by it.
  test(
    'a new kind: choose Recipe, save, the chip filters the feed by it',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openFeed(page);
      const dialog = await openDialog(page);
      await type(dialog).click();
      await expect(page.getByRole('option')).toHaveText([
        'All types',
        'Video',
        'Article',
        'Shopping',
        'Podcast',
        'Document',
        'Code',
        'App',
        'Post',
        'Recipe',
        'Other',
      ]);
      await page.getByRole('option', { name: 'Recipe', exact: true }).click();
      await expect(type(dialog)).toContainText('Recipe');
      await expect(dialog.getByText(/Found [1-9]\d* links?/u)).toBeVisible();

      await dialog.getByRole('textbox', { name: 'Name' }).fill('Cooking');
      await dialog.getByRole('button', { name: 'Save view' }).click();
      await expect(dialog).toHaveCount(0);
      const cooking = views(page).getByRole('button', { name: /^Cooking \d+$/u });
      await cooking.click();
      await expect(cooking).toHaveAttribute('aria-pressed', 'true');
      await expect(page).toHaveURL(/kind=recipe/u);
    },
  );

  test('with AI: the limit shows as a line and the rows stay available', async ({ page }) => {
    await seedAi(page);
    await openFeed(page);
    const dialog = await openDialog(page);
    await dialog.getByRole('textbox', { name: 'Describe what to show' }).fill('anything ai-quota');
    await dialog.getByRole('button', { name: 'Compose' }).click();
    await expect(dialog.getByText(/used today’s questions/u)).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('button', { name: 'save the current filter' }).click();
    await expect(dialog.getByRole('combobox', { name: 'Where' })).toBeVisible();
  });
});

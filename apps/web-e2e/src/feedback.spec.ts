import { COLOR_SCHEME } from './models/color-scheme.const';
import { openSendFeedback, typeFeedback } from './support/feedback';
import { openSettingsSection, seedSession } from './support/mock-session';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';

const IDEA = 'It would be great to sort a folder by when I last opened a link.';

test.describe('send feedback (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
  });

  test(
    'sends an idea, says thanks, and Your feedback lists it as Received',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      const dialog = await openSendFeedback(page);
      await expect(dialog.getByRole('radio', { name: 'Idea' })).toBeChecked();
      await expect(dialog.getByLabel('Attach browser and app version')).toBeChecked();
      await typeFeedback(dialog, IDEA);
      await expect(dialog.getByText(`${IDEA.length} / 2000`)).toBeVisible();

      await dialog.getByRole('button', { name: 'Send', exact: true }).click();

      await expect(page.getByText("We read every message. You'll see its status")).toBeVisible();
      await page.getByRole('button', { name: 'Done' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await openSettingsSection(page, 'Your feedback');
      await expect(page).toHaveURL(/\/settings\/feedback$/);
      const main = page.getByRole('main');
      const item = main.getByRole('listitem').filter({ hasText: IDEA });
      await expect(item).toBeVisible();
      await expect(item.getByText('Idea', { exact: true })).toBeVisible();
      await expect(item.getByText('Sent today')).toBeVisible();
      await expect(item.getByText('Received', { exact: true })).toBeVisible();
    },
  );

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });
    });
  }
});

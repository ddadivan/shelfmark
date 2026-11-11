import { COLOR_SCHEME } from './models/color-scheme.const';
import {
  MOCK_FEEDBACK_SCENARIO_KEY,
  openSendFeedback,
  sendIdea,
  setMockKey,
  typeFeedback,
} from './support/feedback';
import { expectNoBlockingViolations } from './support/axe';
import { MOCK_USER, openSettingsSection, seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { expect, test } from './support/test';

const IDEA = 'It would be great to sort a folder by when I last opened a link.';

test.describe('send feedback (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
  });

  test('sends an idea, says thanks, and Your feedback lists it as Received', async ({ page }) => {
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
  });

  test('a failed send keeps the text and works on the next try', async ({ page }) => {
    await setMockKey(page, MOCK_FEEDBACK_SCENARIO_KEY, 'server-error');
    const dialog = await openSendFeedback(page);
    await typeFeedback(dialog, IDEA);

    await dialog.getByRole('button', { name: 'Send', exact: true }).click();

    await expect(dialog.getByRole('alert')).toContainText(
      "Couldn't send. Your text is kept — try again in a moment.",
    );
    await expect(dialog.getByRole('textbox')).toHaveValue(IDEA);

    await setMockKey(page, MOCK_FEEDBACK_SCENARIO_KEY, null);
    await dialog.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
  });

  test('a 429 has its own message and keeps the text', async ({ page }) => {
    await setMockKey(page, MOCK_FEEDBACK_SCENARIO_KEY, 'rate-limited');
    const dialog = await openSendFeedback(page);
    await typeFeedback(dialog, IDEA);

    await dialog.getByRole('button', { name: 'Send', exact: true }).click();

    await expect(dialog.getByRole('alert')).toContainText('You have sent a lot of messages');
    await expect(dialog.getByRole('textbox')).toHaveValue(IDEA);
  });

  test('an empty message is not sent', async ({ page }) => {
    const dialog = await openSendFeedback(page);

    await dialog.getByRole('button', { name: 'Send', exact: true }).click();

    await expect(dialog.getByText('Write a message first.')).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Send feedback' })).toBeVisible();
  });

  test('takes a small PNG, shows it, and lets it be removed', async ({ page }) => {
    const dialog = await openSendFeedback(page);

    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'shot.png',
      mimeType: 'image/png',
      buffer: Buffer.from('not really a png but small'),
    });

    await expect(dialog.getByText('shot.png')).toBeVisible();
    await expect(dialog.locator('img')).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove screenshot' }).click();
    await expect(dialog.locator('img')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'choose a file' })).toBeFocused();
  });

  test('rejects a screenshot of the wrong type or over 2 MB, with a clear message', async ({
    page,
  }) => {
    const dialog = await openSendFeedback(page);
    const input = dialog.locator('input[type="file"]');

    await input.setInputFiles({
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF'),
    });
    await expect(dialog.getByRole('alert')).toContainText(
      'That file is not a PNG, JPEG or WebP image.',
    );
    await expect(dialog.locator('img')).toHaveCount(0);

    await input.setInputFiles({
      name: 'big.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    });
    await expect(dialog.getByRole('alert')).toContainText(
      'That image is larger than 2 MB. Choose a smaller one.',
    );
    await expect(dialog.locator('img')).toHaveCount(0);
  });

  test('Your feedback has its own Send feedback button and shows the new message at once', async ({
    page,
  }) => {
    await openSettingsSection(page, 'Your feedback');
    const main = page.getByRole('main');
    await expect(main.getByText('No messages yet')).toBeVisible();

    await main.getByRole('button', { name: 'Send feedback' }).click();
    const dialog = page.getByRole('dialog', { name: 'Send feedback' });
    await typeFeedback(dialog, 'From the settings page');
    await dialog.getByRole('button', { name: 'Send', exact: true }).click();
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(main.getByText('From the settings page')).toBeVisible();
    await expect(main.getByText('No messages yet')).toHaveCount(0);
  });

  test('a sent message survives a reload of Your feedback', async ({ page }) => {
    await sendIdea(page, IDEA);

    await page.goto('/settings/feedback');

    await expect(page.getByRole('main').getByText(IDEA)).toBeVisible();
  });

  test('the message is private to its user', async ({ page }) => {
    await sendIdea(page, IDEA);
    await page.evaluate(
      ([key, user]) => {
        localStorage.setItem(key, user);
      },
      [
        'sm-mock-session',
        JSON.stringify({ ...MOCK_USER, id: 'someone-else', email: 'else@example.com' }),
      ],
    );

    await page.goto('/settings/feedback');

    await expect(page.getByRole('main').getByText('No messages yet')).toBeVisible();
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      test('has no blocking axe violations in the dialog (form, error, thanks) and on the page', async ({
        page,
      }, testInfo) => {
        const dialog = await openSendFeedback(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await settled(page);
        await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });

        await dialog.locator('input[type="file"]').setInputFiles({
          name: 'notes.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF'),
        });
        await expect(dialog.getByRole('alert')).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });

        await typeFeedback(dialog, IDEA);
        await dialog.getByRole('button', { name: 'Send', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });
        await page.getByRole('button', { name: 'Done' }).click();

        await openSettingsSection(page, 'Your feedback');
        await expect(page.getByRole('main').getByText(IDEA)).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, testInfo);
      });
    });
  }
});

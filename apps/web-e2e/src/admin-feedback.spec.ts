import type { Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import {
  MOCK_ADMIN_KEY,
  openSendFeedback,
  pngFiles,
  seedMockKey,
  sendIdea,
  setMockKey,
  typeFeedback,
} from './support/feedback';
import { expectNoBlockingViolations } from './support/axe';
import {
  MOCK_USER,
  openAccountMenu,
  openSettingsSection,
  seedSession,
} from './support/mock-session';
import { settled } from './support/settled';
import { isCompact, tabBar } from './support/sidebar';
import { expect, test } from './support/test';

const IDEA = 'Sort a folder by when I last opened a link';

/** Opens the inbox the way each device has it: the account menu, or the You list. */
async function openInbox(page: Page): Promise<void> {
  if (isCompact(page)) {
    await tabBar(page).getByRole('link', { name: 'You' }).click();
    await page.getByRole('main').getByRole('link', { name: 'Feedback inbox' }).click();
  } else {
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Feedback inbox' }).click();
  }
  await expect(page).toHaveURL(/\/admin\/feedback$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Feedback inbox' })).toBeVisible();
}

/** Picks `option` in the combobox called `name` inside `scope`. */
async function choose(
  page: Page,
  scope: ReturnType<Page['locator']>,
  name: string,
  option: string,
) {
  await scope.getByRole('combobox', { name }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('admin feedback inbox (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('the inbox shows every screenshot of a message (#352)', async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    const dialog = await openSendFeedback(page);
    await dialog.locator('input[type="file"]').setInputFiles(pngFiles(3));
    await expect(dialog.locator('img')).toHaveCount(3);
    await typeFeedback(dialog, IDEA);
    await dialog.getByRole('button', { name: 'Send', exact: true }).click();
    await page.getByRole('button', { name: 'Done' }).click();

    await openInbox(page);
    const item = page.getByRole('main').getByRole('listitem').filter({ hasText: IDEA });
    const shots = item.getByRole('link', { name: /^Open screenshot \d of 3$/ });
    await expect(shots).toHaveCount(3);
    await expect(shots.nth(2)).toHaveAttribute('target', '_blank');
    // The images really load (the mock keeps small ones as data: URLs).
    await expect
      .poll(() =>
        item
          .locator('img')
          .evaluateAll((images) =>
            images.every((image) => Number(Reflect.get(image, 'naturalWidth')) > 0),
          ),
      )
      .toBe(true);
  });

  test('the author answers a message and the user sees status and reply', async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await sendIdea(page, IDEA);

    await openInbox(page);
    const item = page.getByRole('main').getByRole('listitem').filter({ hasText: IDEA });
    await expect(item).toBeVisible();
    await expect(item.getByText(MOCK_USER.name, { exact: true })).toBeVisible();
    await expect(item.getByText(MOCK_USER.email)).toBeVisible();
    await expect(item.locator('app-feedback-status-badge')).toHaveText('Received');
    await expect(item.getByRole('button', { name: 'Save' })).toBeDisabled();

    await choose(page, item, 'Status', 'Planned');
    await item.getByRole('textbox', { name: 'Reply' }).fill('Good idea, it is on the list.');
    await item.getByRole('button', { name: 'Save' }).click();

    await expect(item.locator('app-feedback-status-badge')).toHaveText('Planned');
    await expect(item.getByRole('button', { name: 'Save' })).toBeDisabled();

    await openSettingsSection(page, 'Your feedback');
    const mine = page.getByRole('main').getByRole('listitem').filter({ hasText: IDEA });
    await expect(mine.getByText('Planned', { exact: true })).toBeVisible();
    await expect(mine.getByText('Reply: Good idea, it is on the list.')).toBeVisible();
  });

  test('the status filter narrows the list', async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await sendIdea(page, IDEA);
    await openInbox(page);
    const main = page.getByRole('main');
    await expect(main.getByText(IDEA)).toBeVisible();

    await choose(page, main, 'Show', 'Done');
    await expect(main.getByText('No messages')).toBeVisible();
    await expect(main.getByText(IDEA)).toHaveCount(0);

    await choose(page, main, 'Show', 'Received');
    await expect(main.getByText(IDEA)).toBeVisible();
  });

  test('a failed save rolls back and shows an error toast', async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await sendIdea(page, IDEA);
    await openInbox(page);
    const item = page.getByRole('main').getByRole('listitem').filter({ hasText: IDEA });
    await setMockKey(page, MOCK_ADMIN_KEY, 'save-fails');

    await choose(page, item, 'Status', 'Done');
    await item.getByRole('textbox', { name: 'Reply' }).fill('Done!');
    await item.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText("Couldn't save")).toBeVisible();
    await expect(item.locator('app-feedback-status-badge')).toHaveText('Received');
    // The draft stays, so the text is not lost.
    await expect(item.getByRole('textbox', { name: 'Reply' })).toHaveValue('Done!');
    await expect(item.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  test('a regular user has no menu item and /admin/feedback leads to the links', async ({
    page,
  }) => {
    await seedMockKey(page, MOCK_ADMIN_KEY, 'off');
    await seedSession(page);
    await page.goto('/links');
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();

    if (isCompact(page)) {
      await tabBar(page).getByRole('link', { name: 'You' }).click();
      await expect(
        page.getByRole('main').getByRole('link', { name: 'Your feedback' }),
      ).toBeVisible();
      await expect(
        page.getByRole('main').getByRole('link', { name: 'Feedback inbox' }),
      ).toHaveCount(0);
    } else {
      await openAccountMenu(page);
      await expect(page.getByRole('menuitem', { name: 'Send feedback' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Feedback inbox' })).toHaveCount(0);
      await page.keyboard.press('Escape');
    }

    await page.goto('/admin/feedback');
    await expect(page).toHaveURL(/\/links$/);
  });

  test('a guest on /admin/feedback goes to sign-in and not to the inbox', async ({ page }) => {
    await page.goto('/admin/feedback');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fadmin%2Ffeedback$/);
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      test('the inbox has no blocking axe violations', async ({ page }, testInfo) => {
        await seedSession(page);
        await page.goto('/links');
        await sendIdea(page, IDEA);
        await openInbox(page);
        await expect(page.getByRole('main').getByText(IDEA)).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await settled(page);

        await expectNoBlockingViolations(page, testInfo);
      });
    });
  }
});

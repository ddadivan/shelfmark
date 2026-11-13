import type { Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { MOCK_ADMIN_KEY, seedMockKey, sendIdea } from './support/feedback';
import {
  MOCK_USER,
  openAccountMenu,
  openSettingsSection,
  seedSession,
} from './support/mock-session';
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

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });
    });
  }
});

import { expect, type Locator, type Page } from '@playwright/test';
import { openAccountMenu } from './mock-session';
import { isPhone, tabBar } from './sidebar';

// Same values as the mock constants in apps/web/src/app/features/feedback/mock/models.
export const MOCK_FEEDBACK_SCENARIO_KEY = 'sm-mock-feedback-scenario';
export const MOCK_ADMIN_KEY = 'sm-mock-admin';

/** Sets a localStorage key of the mock APIs on the running page. */
export async function setMockKey(page: Page, key: string, value: string | null): Promise<void> {
  await page.evaluate(
    ([name, next]) => {
      if (next === null) {
        localStorage.removeItem(name);
      } else {
        localStorage.setItem(name, next);
      }
    },
    [key, value] as const,
  );
}

/** Sets a localStorage key of the mock APIs before the app starts (once per tab). */
export async function seedMockKey(page: Page, key: string, value: string): Promise<void> {
  await page.addInitScript(
    ([name, next]) => {
      localStorage.setItem(name, next);
    },
    [key, value] as const,
  );
}

/** Opens the "Send feedback" dialog the way each device has it: the account menu, or the You list. */
export async function openSendFeedback(page: Page): Promise<Locator> {
  if (isPhone(page)) {
    await tabBar(page).getByRole('link', { name: 'You' }).click();
    await page.getByRole('main').getByRole('button', { name: 'Send feedback' }).click();
  } else {
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Send feedback' }).click();
  }
  const dialog = page.getByRole('dialog', { name: 'Send feedback' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Types the message into an open feedback dialog. */
export async function typeFeedback(dialog: Locator, text: string): Promise<void> {
  await dialog.getByRole('textbox').fill(text);
}

/** Sends an idea from the account menu / You list and closes the thank-you with Done. */
export async function sendIdea(page: Page, text: string): Promise<void> {
  const dialog = await openSendFeedback(page);
  await typeFeedback(dialog, text);
  await dialog.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

import { type Page } from '@playwright/test';
import { MOCK_USER, seedSession } from './support/mock-session';
import { expect, test } from './support/test';

const SESSION_KEY = 'sm-mock-session';
const ROW_BUTTON = 'Delete account';

async function openDialog(page: Page) {
  await page.goto('/settings/account');
  await page.getByRole('main').getByRole('button', { name: ROW_BUTTON }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete your account?' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('delete account (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock auth API');

  test('the button waits for the typed email, then deletes and lands on the landing page', async ({
    page,
  }) => {
    await seedSession(page);
    const dialog = await openDialog(page);
    const confirm = dialog.getByRole('button', { name: ROW_BUTTON });

    await expect(confirm).toBeDisabled();
    await dialog.getByLabel('Type your email to confirm').fill('someone@example.com');
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel('Type your email to confirm').fill(MOCK_USER.email.toUpperCase());
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('All your data was deleted')).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBeNull();

    // The session is gone: a protected page sends the guest to sign-in.
    await page.goto('/settings/account');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('Cancel closes the dialog and the account stays', async ({ page }) => {
    await seedSession(page);
    const dialog = await openDialog(page);

    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/settings\/account$/);
  });
});

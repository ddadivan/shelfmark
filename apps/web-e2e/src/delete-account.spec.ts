import { type Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { settled } from './support/settled';
import { expectNoBlockingViolations } from './support/axe';
import { demoUser, MOCK_USER, seedSession } from './support/mock-session';
import { expect, test } from './support/test';

// Same values as the mock in apps/web/src/app/features/account-deletion/mock/.
const SCENARIO_KEY = 'sm-mock-account-deletion';
const SESSION_KEY = 'sm-mock-session';
const ROW_BUTTON = 'Delete account';

async function openDialog(page: Page) {
  await page.goto('/settings');
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
    await expect(page.getByText('Your account and all your data were deleted.')).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBeNull();

    // The session is gone: a protected page sends the guest to sign-in.
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('Cancel closes the dialog and the account stays', async ({ page }) => {
    await seedSession(page);
    const dialog = await openDialog(page);

    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/settings$/);
  });

  for (const [scenario, message] of [
    ['rate-limited', 'Too many attempts. Try again in a minute.'],
    ['server-error', 'We could not delete your account. Nothing was deleted. Try again.'],
  ] as const) {
    test(`a ${scenario} answer shows an inline error and keeps the account`, async ({ page }) => {
      await seedSession(page);
      await page.addInitScript(
        ([key, value]) => localStorage.setItem(key, value),
        [SCENARIO_KEY, scenario],
      );
      const dialog = await openDialog(page);

      await dialog.getByLabel('Type your email to confirm').fill(MOCK_USER.email);
      await dialog.getByRole('button', { name: ROW_BUTTON }).click();

      await expect(dialog.getByText(message)).toBeVisible();
      await expect(dialog).toBeVisible();
      await expect(page).toHaveURL(/\/settings$/);
    });
  }

  test('a demo user does not see the row', async ({ page }) => {
    await seedSession(page, demoUser(5));
    await page.goto('/settings');

    await expect(page.getByRole('heading', { level: 1, name: /^(Settings|You)$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: ROW_BUTTON })).toHaveCount(0);
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`accessibility (${colorScheme})`, () => {
      test.use({ colorScheme });

      test('settings page and open dialog have no blocking axe violations', async ({
        page,
      }, testInfo) => {
        await seedSession(page);
        await page.goto('/settings');
        await expect(page.getByRole('button', { name: ROW_BUTTON })).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, testInfo);

        await page.getByRole('main').getByRole('button', { name: ROW_BUTTON }).click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, testInfo, { include: '[role="alertdialog"]' });
      });
    });
  }
});

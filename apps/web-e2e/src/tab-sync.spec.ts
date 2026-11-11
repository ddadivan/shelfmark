import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession, signOutFromUi } from './support/mock-session';

// Mirror MOCK_LINKS ("Simple pasta"); the e2e project cannot import from libs/shared/contracts.
const PASTA = 'Simple pasta';

/** A second tab of the same browser, with the same monitoring stub as the `page` fixture. */
async function secondTab(page: Page): Promise<Page> {
  const other = await page.context().newPage();
  await other.route('**/api/monitoring/config', (route) =>
    route.fulfill({ json: { dsn: null, environment: 'test', release: null } }),
  );
  return other;
}

test.describe('sync between browser tabs (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('a link deleted in one tab disappears from the other', async ({ page }) => {
    await page.goto('/links');
    const other = await secondTab(page);
    await other.goto('/links');
    await expect(other.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();

    await page
      .locator('ui-card')
      .filter({ hasText: PASTA })
      .getByRole('button', { name: /^Actions for / })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);
    // The delete is sent when its Undo window ends; dismissing the toast ends it now.
    await page
      .getByRole('status')
      .filter({ hasText: 'Moved to Trash' })
      .getByRole('button', { name: 'Dismiss' })
      .click();

    await expect(other.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);
  });

  test('a favorite toggled in one tab shows in the other', async ({ page }) => {
    await page.goto('/links');
    const other = await secondTab(page);
    await other.goto('/links');
    const star = (tab: Page) =>
      tab
        .locator('ui-card')
        .filter({ hasText: PASTA })
        .getByRole('button', { name: /^Favorite: / });
    const before = await star(other).getAttribute('aria-pressed');

    await star(page).click();

    await expect(star(other)).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  });

  test('the theme chosen in one tab applies in the other', async ({ page }) => {
    await page.goto('/settings/appearance');
    const other = await secondTab(page);
    await other.goto('/links');
    await expect(other.locator('ui-card').first()).toBeVisible();

    await page.getByRole('radio', { name: 'Dark' }).check({ force: true });
    await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('radio', { name: 'Light' }).check({ force: true });
    await expect(other.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('signing out in one tab locks the other and clears its library', async ({ page }) => {
    await page.goto('/links');
    const other = await secondTab(page);
    await other.goto('/links');
    await expect(other.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();

    await signOutFromUi(page);

    const lock = other.getByRole('alertdialog', { name: 'You signed out in another tab' });
    await expect(lock).toBeVisible();
    await expect(other.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);
    await expect(lock.getByRole('button', { name: 'Sign in again' })).toBeFocused();
    // It cannot be dismissed.
    await other.keyboard.press('Escape');
    await expect(lock).toBeVisible();

    await lock.getByRole('button', { name: 'Sign in again' }).click();
    await expect(other).toHaveURL(/\/sign-in\?returnUrl=%2Flinks$/);
  });
});

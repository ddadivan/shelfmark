import { expect, test } from './support/test';
import { dismissOnboarding, MOCK_USER, openAccountMenu, seedSession } from './support/mock-session';

const GITHUB_BUTTON = 'Continue with GitHub';

test.describe('sign-in flow (mock auth)', () => {
  test('a guest on a protected URL lands on sign-in and returns after signing in', async ({
    page,
  }) => {
    await page.goto('/links');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Flinks$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'All your links on one shelf' }),
    ).toBeVisible();

    await page.getByRole('button', { name: GITHUB_BUTTON }).click();

    await dismissOnboarding(page);
    await expect(page).toHaveURL(/\/links$/);
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
  });

  test('sign-out clears the session and returns to sign-in', async ({ page }) => {
    await seedSession(page);
    await page.goto('/');

    await expect(page).toHaveURL(/\/links$/);
    // The name is hidden on a phone (the avatar stays), so only check that it is rendered.
    await expect(page.getByText(MOCK_USER.name)).toHaveCount(1);

    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goto('/links');
    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Flinks$/);
  });

  test('a signed-in user is kept away from sign-in', async ({ page }) => {
    await seedSession(page);
    await page.goto('/sign-in');

    await expect(page).toHaveURL(/\/links$/);
  });

  test('the sign-in page fits a 360px phone and shows the expiry reason', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/sign-in?reason=session-expired');

    await expect(page.getByText('Your session has expired. Sign in again.')).toBeVisible();
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

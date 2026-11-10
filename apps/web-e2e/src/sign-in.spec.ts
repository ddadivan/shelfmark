import { expect, test } from './support/test';
import { isPhone, tabBar } from './support/sidebar';
import { dismissOnboarding, MOCK_USER, seedSession, signOutFromUi } from './support/mock-session';

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
    if (isPhone(page)) {
      // The account is on the You tab, where the name is printed.
      await tabBar(page).getByRole('link', { name: 'You' }).click();
      await expect(page.getByText(MOCK_USER.name)).toHaveCount(1);
    } else {
      // The top bar shows the avatar only, not the name.
      await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    }

    await signOutFromUi(page);
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

  test('on a desktop the form is centred on the middle axis of the mosaic', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const centre = async (selector: string): Promise<number> => {
      const box = await page.locator(selector).first().boundingBox();
      if (!box) {
        throw new Error(`${selector} has no box`);
      }
      return box.y + box.height / 2;
    };
    const panel = await centre('.sign-in__panel');
    const art = await centre('.sign-in__art');
    expect(Math.abs(panel - art)).toBeLessThanOrEqual(2);
    // Logo stays at the top of the column and the copyright at the bottom.
    const logo = await page.locator('.sign-in__header').boundingBox();
    const footer = await page.locator('.sign-in__footer').boundingBox();
    expect(logo?.y).toBeLessThan(80);
    expect((footer?.y ?? 0) + (footer?.height ?? 0)).toBeGreaterThan(900 - 80);
  });
});

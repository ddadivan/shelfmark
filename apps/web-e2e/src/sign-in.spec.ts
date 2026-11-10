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

  test('on a desktop the glass card is centred and the cards drift around it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const card = await page.locator('.sign-in__panel').boundingBox();
    if (!card) {
      throw new Error('the sign-in card has no box');
    }
    expect(Math.abs(card.x + card.width / 2 - 1440 / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(card.y + card.height / 2 - 900 / 2)).toBeLessThanOrEqual(2);
    // The mosaic band is a phone layout.
    await expect(page.locator('.sign-in__art')).toHaveCount(0);

    // The four cards float and take turns to land (ring), each on its own loop.
    await expect(page.locator('.sd-card')).toHaveCount(4);
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a instanceof CSSAnimation && a.playState === 'running')
        .map((a) => (a as CSSAnimation).animationName)
        .filter((name) => name.endsWith('sd-float') || name.endsWith('sd-ring')),
    );
    expect(running.filter((n) => n.endsWith('sd-float'))).toHaveLength(4);
    expect(running.filter((n) => n.endsWith('sd-ring'))).toHaveLength(4);
  });

  test('with reduced motion the drifting cards stay still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in');
    await expect(page.locator('.sd-card')).toHaveCount(4);

    const animations = await page.evaluate(
      () => document.getAnimations().filter((a) => a instanceof CSSAnimation).length,
    );
    expect(animations).toBe(0);
  });

  test('on a phone the mosaic sits above the form', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const art = await page.locator('.sign-in__art').boundingBox();
    const panel = await page.locator('.sign-in__panel').boundingBox();
    expect(art).not.toBeNull();
    expect((art?.y ?? 0) + (art?.height ?? 0)).toBeLessThanOrEqual((panel?.y ?? 0) + 1);
    await expect(page.locator('.sd-card')).toHaveCount(0);
  });
});

import { expect, test, type Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { dismissOnboarding, NEW_USER, openAccountMenu, seedSession } from './support/mock-session';

const FIRST_TITLE = 'All your links in one place';
const GITHUB_BUTTON = 'Continue with GitHub';

async function signInAsNewUser(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: GITHUB_BUTTON }).click();
}

test.describe('onboarding (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock auth API');

  test('a first sign-in shows the dialog; Skip closes it and a reload does not bring it back', async ({
    page,
  }) => {
    await signInAsNewUser(page);

    const dialog = page.getByRole('dialog', { name: FIRST_TITLE });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img', { name: 'Step 1 of 3' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Esc counts as Skip', async ({ page }) => {
    await signInAsNewUser(page);
    await expect(page.getByRole('dialog', { name: FIRST_TITLE })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('steps through with Next, Back and the arrow keys to the add-link dialog', async ({
    page,
  }) => {
    await signInAsNewUser(page);
    const dialog = page.getByRole('dialog', { name: FIRST_TITLE });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Next' })).toBeFocused();

    await dialog.getByRole('button', { name: 'Next' }).click();
    const second = page.getByRole('dialog', { name: 'Save in a second' });
    await expect(second).toBeVisible();
    await expect(second.getByRole('status')).toHaveText('Step 2 of 3: Save in a second');
    await expect(second.getByRole('button', { name: 'Next' })).toBeFocused();

    await second.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('dialog', { name: FIRST_TITLE })).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const last = page.getByRole('dialog', { name: 'Find it right away' });
    await expect(last).toBeVisible();

    await last.getByRole('button', { name: 'Add your first link' }).click();
    await expect(page.getByRole('dialog', { name: 'Add link' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Find it right away' })).toHaveCount(0);

    // Completed through the last step: gone after a reload.
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('"Show welcome again" in Settings reopens the dialog', async ({ page }) => {
    await signInAsNewUser(page);
    await dismissOnboarding(page);

    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.getByText('See the 3-step introduction again')).toBeVisible();

    await page.getByRole('button', { name: 'Show welcome again' }).click();
    const dialog = page.getByRole('dialog', { name: FIRST_TITLE });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('the dialog fits a 360px phone without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await signInAsNewUser(page);
    const dialog = page.getByRole('dialog', { name: FIRST_TITLE });
    await expect(dialog).toBeVisible();

    for (const title of ['Save in a second', 'Find it right away']) {
      await dialog.getByRole('button', { name: /^(Next)$/ }).click();
      await expect(page.getByRole('dialog', { name: title })).toBeVisible();
    }
    const box = await dialog.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(dialog.getByRole('button', { name: 'Add your first link' })).toBeVisible();
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      test('every step has no serious or critical axe violations', async ({ page }, testInfo) => {
        await seedSession(page, NEW_USER);
        await page.goto('/links');
        const dialog = page.getByRole('dialog', { name: FIRST_TITLE });
        await expect(dialog).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);

        await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });
        await dialog.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('dialog', { name: 'Save in a second' })).toBeVisible();
        await page.waitForTimeout(400);
        await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('dialog', { name: 'Find it right away' })).toBeVisible();
        await page.waitForTimeout(400);
        await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });
      });
    });
  }

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the step appears without a slide', async ({ page }) => {
      await seedSession(page, NEW_USER);
      await page.goto('/links');
      await expect(page.getByRole('dialog', { name: FIRST_TITLE })).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByRole('dialog', { name: 'Save in a second' })).toBeVisible();

      const animation = await page
        .locator('.onboarding__step')
        .evaluate((element) => getComputedStyle(element).animationName);
      expect(animation).toBe('none');
    });
  });

  test('motion is on by default: the step slides in', async ({ page }) => {
    await seedSession(page, NEW_USER);
    await page.goto('/links');
    await expect(page.getByRole('dialog', { name: FIRST_TITLE })).toBeVisible();

    const animation = await page
      .locator('.onboarding__step')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(animation).not.toBe('none');
  });
});

import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import {
  dismissOnboarding,
  NEW_USER,
  openSettingsSection,
  seedSession,
} from './support/mock-session';
import { E2E_TAG } from './models/e2e-tag.const';

const FIRST_TITLE = 'All your links in one place';
const GITHUB_BUTTON = 'Continue with GitHub';

async function signInAsNewUser(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: GITHUB_BUTTON }).click();
}

test.describe('onboarding (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock auth API');

  test(
    'a first sign-in shows the dialog; Skip closes it and a reload does not bring it back',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await signInAsNewUser(page);

      const dialog = page.getByRole('dialog', { name: FIRST_TITLE });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('img', { name: 'Step 1 of 3' })).toBeVisible();
      await dialog.getByRole('button', { name: 'Skip' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    },
  );

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

  test('shows once: neither Settings nor the account menu bring it back (#315)', async ({
    page,
  }) => {
    await signInAsNewUser(page);
    await dismissOnboarding(page);

    await openSettingsSection(page, 'Account');
    await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show welcome again' })).toHaveCount(0);
    await expect(page.getByText('Welcome tour')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: FIRST_TITLE })).toHaveCount(0);
  });

  test('the dialog fits a 360px phone without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await signInAsNewUser(page);
    const dialog = page.getByRole('dialog', { name: FIRST_TITLE });
    await expect(dialog).toBeVisible();

    for (const title of ['Save in a second', 'Find it right away']) {
      await page.getByRole('dialog').getByRole('button', { name: 'Next' }).click();
      await expect(page.getByRole('dialog', { name: title })).toBeVisible();
    }
    const last = page.getByRole('dialog');
    // The sheet itself: as wide as the phone and nothing inside it overflows. (The page behind
    // is not measured here; its own 360px layout is covered by the shell and page specs.)
    const sheet = last.locator('.ui-dialog');
    const box = await sheet.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(360);
    const inner = await sheet.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(inner).toBeLessThanOrEqual(0);
    const body = await last
      .locator('.ui-dialog__body')
      .evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(body).toBeLessThanOrEqual(0);
    await expect(last.getByRole('button', { name: 'Add your first link' })).toBeVisible();
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the step appears without a slide', async ({ page }) => {
      await seedSession(page, NEW_USER);
      await page.goto('/links');
      await expect(page.getByRole('dialog', { name: FIRST_TITLE })).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByRole('dialog', { name: 'Save in a second' })).toBeVisible();

      const animation = await page.evaluate<string>(
        "getComputedStyle(document.querySelector('.onboarding__step')).animationName",
      );
      expect(animation).toBe('none');
    });
  });

  test('motion is on by default: the step slides in', async ({ page }) => {
    await seedSession(page, NEW_USER);
    await page.goto('/links');
    await expect(page.getByRole('dialog', { name: FIRST_TITLE })).toBeVisible();

    const animation = await page.evaluate<string>(
      "getComputedStyle(document.querySelector('.onboarding__step')).animationName",
    );
    expect(animation).not.toBe('none');
  });
});

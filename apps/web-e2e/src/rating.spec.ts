import type { Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { settled } from './support/settled';
import { expectNoBlockingViolations } from './support/axe';
import { demoUser, MOCK_USER, NEW_USER, seedSession } from './support/mock-session';
import { expect, test } from './support/test';

// Same value as MOCK_RATING_STORAGE_KEY in the rating feature's mock.
const RATING_KEY = 'sm-mock-feedback';
const NOW = new Date('2026-06-10T10:00:00.000Z');
const DAY = 86_400_000;
const SHOW_MS = 5000;
const THANKS_MS = 4000;
const QUESTION = 'How do you like Shelfmark so far?';
const FEEDBACK_TITLE = 'What would make it better?';

/** Signs in (onboarded, regular), freezes the start at NOW and makes `daysAgo` the sign-up time. */
async function openLibrary(
  page: Page,
  daysAgo: number,
  user: Record<string, unknown> = { ...MOCK_USER, onboardingCompletedAt: '2026-06-01T00:00:00Z' },
): Promise<void> {
  await page.clock.install({ time: NOW });
  await seedSession(page, user);
  await page.addInitScript(
    ([key, createdAt]) => {
      // Once per tab: a reload keeps the answers the mock stored.
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ createdAt }));
      }
    },
    [RATING_KEY, new Date(NOW.getTime() - daysAgo * DAY).toISOString()],
  );
  await page.goto('/links');
  await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
}

async function openRating(page: Page, daysAgo = 9) {
  await openLibrary(page, daysAgo);
  await page.clock.runFor(SHOW_MS);
  const dialog = page.getByRole('dialog', { name: QUESTION });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function stored(page: Page): Promise<{ entries?: Record<string, unknown> }> {
  return page.evaluate<{ entries?: Record<string, unknown> }, string>(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    RATING_KEY,
  );
}

test.describe('app rating (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock API');

  test('appears 5 seconds after load, not before', async ({ page }) => {
    await openLibrary(page, 9);

    // The page clock also runs by itself after the load, so the negative check keeps a margin.
    await page.clock.runFor(500);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.clock.runFor(SHOW_MS);
    await expect(page.getByRole('dialog', { name: QUESTION })).toBeVisible();
  });

  test('a high score goes straight to thanks, which closes by itself after 4 s', async ({
    page,
  }) => {
    const dialog = await openRating(page);

    await dialog.getByRole('button', { name: '9 out of 10' }).click();
    const thanks = page.getByRole('dialog', { name: 'Thank you' });
    await expect(thanks).toBeVisible();
    await expect(thanks.getByText('Your rating helps us make Shelfmark better.')).toBeVisible();
    await expect(thanks.getByRole('button', { name: 'Close' })).toBeFocused();

    await page.clock.runFor(THANKS_MS);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await stored(page)).entries).toEqual({ week1: { score: 9 } });

    // Answered: it does not come back.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    await page.clock.runFor(SHOW_MS * 2);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a low score asks for feedback; Send saves it and says we read every message', async ({
    page,
  }) => {
    const dialog = await openRating(page);

    await dialog.getByRole('button', { name: '4 out of 10' }).click();
    const feedback = page.getByRole('dialog', { name: FEEDBACK_TITLE });
    await expect(feedback).toBeVisible();
    await expect(feedback.getByRole('button', { name: 'Send' })).toBeDisabled();

    await feedback.getByRole('textbox', { name: 'Your feedback' }).fill('More folder options');
    await feedback.getByRole('button', { name: 'Send' }).click();

    const thanks = page.getByRole('dialog', { name: 'Thank you' });
    await expect(thanks.getByText('We read every message.')).toBeVisible();
    await page.clock.runFor(THANKS_MS);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await stored(page)).entries).toEqual({
      week1: { score: 4, comment: 'More folder options' },
    });
  });

  test('Skip on the feedback step keeps the score', async ({ page }) => {
    const dialog = await openRating(page);

    await dialog.getByRole('button', { name: '2 out of 10' }).click();
    await page
      .getByRole('dialog', { name: FEEDBACK_TITLE })
      .getByRole('button', { name: 'Skip' })
      .click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await stored(page)).entries).toEqual({ week1: { score: 2 } });
  });

  test('Not now records a skip and the milestone is not asked again', async ({ page }) => {
    const dialog = await openRating(page);

    await dialog.getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () => (await stored(page)).entries).toEqual({ week1: { score: null } });

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    await page.clock.runFor(SHOW_MS * 2);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Esc counts as Not now', async ({ page }) => {
    await openRating(page);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () => (await stored(page)).entries).toEqual({ week1: { score: null } });
  });

  test('only the latest missed milestone is asked', async ({ page }) => {
    const dialog = await openRating(page, 400);

    await dialog.getByRole('button', { name: 'Not now' }).click();
    await expect.poll(async () => (await stored(page)).entries).toEqual({ year1: { score: null } });
  });

  test('digits move focus (0 is 10), arrows move along the scale and Enter picks', async ({
    page,
  }) => {
    const dialog = await openRating(page);
    await expect(dialog).toBeFocused();

    await page.keyboard.press('5');
    await expect(dialog.getByRole('button', { name: '5 out of 10' })).toBeFocused();
    // A digit alone never scores.
    await expect(page.getByRole('dialog', { name: QUESTION })).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('button', { name: '6 out of 10' })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(dialog.getByRole('button', { name: '4 out of 10' })).toBeFocused();

    await page.keyboard.press('0');
    await expect(dialog.getByRole('button', { name: '10 out of 10' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Thank you' })).toBeVisible();
    expect((await stored(page)).entries).toEqual({ week1: { score: 10 } });
  });

  test('is not shown before day 3', async ({ page }) => {
    await openLibrary(page, 2);

    await page.clock.runFor(SHOW_MS * 2);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('is not shown in demo mode', async ({ page }) => {
    await openLibrary(page, 9, { ...demoUser(24), onboardingCompletedAt: '2026-06-01T00:00:00Z' });

    await page.clock.runFor(SHOW_MS * 2);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('is not shown over the welcome dialog or before onboarding is completed', async ({
    page,
  }) => {
    await page.clock.install({ time: NOW });
    await seedSession(page, NEW_USER);
    await page.addInitScript(
      ([key, createdAt]) => localStorage.setItem(key, JSON.stringify({ createdAt })),
      [RATING_KEY, new Date(NOW.getTime() - 9 * DAY).toISOString()],
    );
    await page.goto('/links');
    const welcome = page.getByRole('dialog', { name: 'All your links in one place' });
    await expect(welcome).toBeVisible();

    await page.clock.runFor(SHOW_MS * 3);
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(welcome).toBeVisible();
  });

  test('waits while another dialog is open and comes once it is closed', async ({ page }) => {
    await openLibrary(page, 9);
    await page.keyboard.press('Control+k');
    const search = page.getByRole('dialog');
    await expect(search).toBeVisible();

    await page.clock.runFor(SHOW_MS * 2);
    await expect(page.getByRole('dialog', { name: QUESTION })).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.clock.runFor(SHOW_MS);
    await expect(page.getByRole('dialog', { name: QUESTION })).toBeVisible();
  });

  test('the scale is one row of ten on a desktop and two rows of five on a phone', async ({
    page,
  }, testInfo) => {
    const dialog = await openRating(page);
    const box = async (name: string) =>
      (await dialog.getByRole('button', { name }).boundingBox())?.y ?? 0;
    // The sheet slides in; compare the rows once it has settled.
    await expect
      .poll(async () => Math.abs((await box('10 out of 10')) - (await box('6 out of 10'))) < 2)
      .toBe(true);
    const first = await box('1 out of 10');
    const sixth = await box('6 out of 10');
    const tenth = await box('10 out of 10');

    if (testInfo.project.name === 'phone') {
      expect(sixth).toBeGreaterThan(first + 10);
      expect(Math.abs(tenth - sixth)).toBeLessThan(2);
      const sheet = dialog.locator('.ui-dialog');
      const sheetBox = await sheet.boundingBox();
      expect(sheetBox?.width).toBeLessThanOrEqual(360);
      const overflow = await sheet.evaluate((element) => element.scrollWidth - element.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    } else {
      expect(Math.abs(tenth - first)).toBeLessThan(2);
    }
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      test('has no blocking axe violations on the rating, feedback and thanks steps', async ({
        page,
      }, testInfo) => {
        const dialog = await openRating(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await page.clock.runFor(500);
        await settled(page);
        await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });

        await dialog.getByRole('button', { name: '3 out of 10' }).click();
        await expect(page.getByRole('dialog', { name: FEEDBACK_TITLE })).toBeVisible();
        await page.clock.runFor(500);
        await settled(page);
        await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });

        await page.getByRole('textbox', { name: 'Your feedback' }).fill('Fine');
        await page.getByRole('button', { name: 'Send' }).click();
        await expect(page.getByRole('dialog', { name: 'Thank you' })).toBeVisible();
        await settled(page);
        await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });
      });
    });
  }
});

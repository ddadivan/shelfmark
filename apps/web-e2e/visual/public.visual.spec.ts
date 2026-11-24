import { LANDING_HEADLINE } from '../src/models/landing-headline.const';
import { expect, expectScreen, test } from './support/visual-test';

test.describe('visual: public pages', () => {
  test('landing, above the fold', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeInViewport();
    await expect(page.locator('.landing-hero')).toBeVisible();
    // The sections below the hero load on idle timers and reveal once on screen: on a tall window
    // (the tablet) the AI block starts in the first screen, so wait for it and its reveal.
    await expect(
      page.getByRole('region', { name: 'Help with sorting, when you want it' }),
    ).toBeAttached();
    await page.waitForFunction(
      "[...document.querySelectorAll('.landing-reveal--pending')].every((el) => el.getBoundingClientRect().top >= innerHeight)",
    );

    await expectScreen(page, 'landing');
  });

  test('sign-in', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(
      page.getByRole('heading', { level: 1, name: 'All your links, and a way back to them' }),
    ).toBeVisible();

    // One card on every width (Shelf block 6b); the drift of cards from 64em.
    await expect(page.locator('.sign-in__panel')).toBeVisible();

    await expectScreen(page, 'sign-in');
  });
});

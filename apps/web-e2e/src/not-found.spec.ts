import { E2E_TAG } from './models/e2e-tag.const';
import { LANDING_HEADLINE } from './models/landing-headline.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { expect, test } from './support/test';

const TITLE = 'This page doesn’t exist';

// Shelf block 6b: an unknown address renders `features/not-found/` (`notFoundRoute`, `**`, last in
// both route tables) in place of a redirect; the way out depends on the session.
test.describe('Not found page', { tag: E2E_TAG.Mobile }, () => {
  test('a guest on an unknown address gets the page and a way to the landing', async ({
    page,
  }, testInfo) => {
    await page.goto('/no-such-page');

    await expect(page).toHaveURL('/no-such-page');
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
    await expect(
      page.getByText('The address may be mistyped, or the page has moved.'),
    ).toBeVisible();
    const overflow = await page.evaluate<number>(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await settled(page);
    await expectNoBlockingViolations(page, testInfo);

    await page.getByRole('link', { name: 'Go to Shelfmark' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
  });

  test('a signed-in person on an unknown deep address gets a way back to the links', async ({
    page,
  }) => {
    test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock auth');
    await seedSession(page);
    await page.goto('/links/nothing/here');

    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
    await page.getByRole('link', { name: 'Go to your links' }).click();
    await expect(page).toHaveURL('/links');
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
  });
});

import { E2E_TAG } from './models/e2e-tag.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { expect, test } from './support/test';

// Shelf 17-help: the public Help center at `/help` (home, article, search, not found) and the
// entries to it. It sits outside the shell, so a guest and a signed-in person see the same pages.
test.describe('Help center', { tag: E2E_TAG.Mobile }, () => {
  test('the home shows the search, the topics and the help tiles without overflow', async ({
    page,
  }, testInfo) => {
    await page.goto('/help');

    await expect(page.getByRole('heading', { level: 1, name: 'How can we help?' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search help articles' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Getting started',
      'Organise',
      'Find',
      'Come back',
      'Read',
      'AI',
    ]);
    await expect(page.getByRole('link', { name: 'Keyboard shortcuts' }).first()).toBeVisible();
    const overflow = await page.evaluate<number>(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await settled(page);
    await expectNoBlockingViolations(page, testInfo);
  });

  test('a topic article opens, shows its sections and moves on with Next', async ({
    page,
  }, testInfo) => {
    await page.goto('/help');
    await page.getByRole('link', { name: 'Rules: file links automatically' }).first().click();

    await expect(page).toHaveURL('/help/rules');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Rules: file links automatically' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toContainText([
      'Create a rule',
      'Apply a rule to links you already have',
      'When Shelfmark suggests a rule',
      'Good to know',
      'Related',
    ]);
    await settled(page);
    await expectNoBlockingViolations(page, testInfo);

    await page.getByRole('link', { name: /Next\s*Favorites and pinned links/ }).click();
    await expect(page).toHaveURL('/help/favorites-pins');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Favorites and pinned links' }),
    ).toBeVisible();
  });

  test('searching lists matching articles with the words marked, and an empty search lists all', async ({
    page,
  }) => {
    await page.goto('/help');
    await page.getByRole('searchbox', { name: 'Search help articles' }).fill('remind');

    await expect(page).toHaveURL(/\/help\?q=remind/);
    await expect(page.getByText('4 articles')).toBeVisible();
    await expect(page.locator('.result').first()).toContainText('Reminders');
    await expect(page.locator('.result mark').first()).toBeVisible();
    await expect(page.getByText('Didn’t find it?')).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search help articles' }).fill('zzzqqq');
    await expect(page.getByText('Nothing found for “zzzqqq”')).toBeVisible();

    await page.goto('/help?q=reminders');
    await page.locator('.result').first().click();
    await expect(page).toHaveURL('/help/reminders');
  });

  test('Ctrl K opens the search results view with the cursor in the field', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { level: 1, name: 'How can we help?' })).toBeVisible();
    await page.keyboard.press('Control+k');

    await expect(page).toHaveURL(/\/help\?q=$/);
    await expect(page.getByRole('searchbox', { name: 'Search help articles' })).toBeFocused();
  });

  test('an unknown article id shows "Article not found" with the way back', async ({ page }) => {
    await page.goto('/help/no-such-article');

    await expect(page.getByRole('heading', { level: 1, name: 'Article not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the Help center' }).click();
    await expect(page).toHaveURL('/help');
    await expect(page.getByRole('heading', { level: 1, name: 'How can we help?' })).toBeVisible();
  });

  test('the landing footer and the signed-in Data and help menu lead to the Help center', async ({
    page,
  }) => {
    test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock auth');
    await page.goto('/about');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Help' }).click();
    await expect(page).toHaveURL('/help');
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

    await seedSession(page);
    await page.goto('/help');
    await expect(page.getByRole('link', { name: 'Back to my shelf' })).toBeVisible();
  });
});

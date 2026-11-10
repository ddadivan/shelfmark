import { expect, test } from './support/test';
import { expectNoBlockingViolations } from './support/axe';
import { openAccountMenu, seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isPhone, tabBar } from './support/sidebar';

test.describe('About and "How it works" (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('a guest at /about sees the public landing', async ({ page }) => {
    await page.goto('/about');

    await expect(page.getByRole('link', { name: 'Open the demo' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to my shelf' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: "What's new" })).toHaveCount(0);
  });

  test('a signed-in person reaches About from the account menu and goes back to the shelf', async ({
    page,
  }, testInfo) => {
    await seedSession(page);
    await page.goto('/links');
    if (isPhone(page)) {
      await tabBar(page).getByRole('link', { name: 'You' }).click();
      await page.getByRole('link', { name: 'About Shelfmark' }).click();
    } else {
      await openAccountMenu(page);
      await page.getByRole('menuitem', { name: 'About Shelfmark' }).click();
    }

    await expect(page).toHaveURL('/about');
    await expect(page.getByRole('heading', { name: "What's new" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the demo' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
    await settled(page);
    await expectNoBlockingViolations(page, testInfo);

    await page.getByRole('link', { name: 'Back to my shelf' }).first().click();
    await expect(page).toHaveURL('/links');
  });

  test('"How it works" opens the video dialog with its chapters', async ({ page }, testInfo) => {
    await seedSession(page);
    await page.goto('/links');
    if (isPhone(page)) {
      await tabBar(page).getByRole('link', { name: 'You' }).click();
      await page.getByRole('button', { name: 'How it works' }).click();
    } else {
      await openAccountMenu(page);
      await page.getByRole('menuitem', { name: 'How it works' }).click();
    }

    const dialog = page.getByRole('dialog', { name: 'Shelfmark in 60 seconds' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('list', { name: 'Chapters' }).getByRole('listitem')).toHaveText([
      /Save a link\s*0:00/,
      /Folders and tags\s*0:18/,
      /Find it again\s*0:41/,
    ]);
    await settled(page);
    await expectNoBlockingViolations(page, testInfo, { include: '[role="dialog"]' });
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });

  test('the sidebar card shows for a new account until it is hidden', async ({ page }) => {
    test.skip(isPhone(page), 'the card lives in the desktop sidebar');
    await seedSession(page);
    await page.goto('/links');
    const card = page.getByRole('region', { name: 'How it works' });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Hide' }).click();
    await expect(card).toHaveCount(0);

    await page.reload();
    await expect(page.locator('ui-card').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'How it works' })).toHaveCount(0);
  });

  test('opening the video from the card also retires the card', async ({ page }) => {
    test.skip(isPhone(page), 'the card lives in the desktop sidebar');
    await seedSession(page);
    await page.goto('/links');
    const card = page.getByRole('region', { name: 'How it works' });

    await card.getByRole('button', { name: 'New here? Watch how it works' }).click();
    await expect(page.getByRole('dialog', { name: 'Shelfmark in 60 seconds' })).toBeVisible();
    await expect(card).toHaveCount(0);
  });
});

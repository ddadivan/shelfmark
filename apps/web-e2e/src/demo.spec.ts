import { expect, test } from '@playwright/test';
import { DEMO_LIMIT } from '@shelfmark/contracts';
import { demoUser, seedSession } from './support/mock-session';
import { E2E_TAG } from './models/e2e-tag.const';

const BANNER_TITLE = "You're in a demo.";

test.describe('demo sign-in (mock auth)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock auth API');

  test(
    '"Open the demo" on the landing opens the library with the banner',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await page.goto('/');
      const demoLink = page
        .getByRole('region', { name: 'Empty your Saved Messages.' })
        .getByRole('link', { name: 'Open the demo' });
      await demoLink.scrollIntoViewIfNeeded();
      await demoLink.click();

      await expect(page).toHaveURL(/\/links$/);
      // A fresh demo user gets the welcome dialog; skip it so the page behind is reachable.
      await page.getByRole('dialog').getByRole('button', { name: 'Skip' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
      const banner = page.getByRole('status').filter({ hasText: BANNER_TITLE });
      await expect(banner).toBeVisible();
      await expect(banner).toContainText(`resets in ${DEMO_LIMIT.SessionHours} hours`);
    },
  );

  test('an expired demo session is dropped with the demo-ended notice', async ({ page }) => {
    await seedSession(page, demoUser(-1));
    await page.goto('/links');

    await expect(page).toHaveURL(/\/sign-in\?reason=demo-expired$/);
    await expect(page.getByText('The demo has ended.')).toBeVisible();
  });

  test('the library with the banner fits a 360px phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await seedSession(page, demoUser(23));
    await page.goto('/links');

    await expect(page.getByText(BANNER_TITLE)).toBeVisible();
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

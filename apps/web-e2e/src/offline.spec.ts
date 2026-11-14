import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';

test.describe('offline banner (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('shows a polite notice while the browser is offline and hides it again', async ({
    page,
    context,
  }) => {
    await seedSession(page);
    await page.goto('/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
    await expect(page.getByText(/You're offline/)).toHaveCount(0);

    await context.setOffline(true);
    const notice = page.getByRole('status').filter({ hasText: "You're offline" });
    await expect(notice).toBeVisible();

    await context.setOffline(false);
    await expect(notice).toHaveCount(0);
  });
});

import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';

test.describe('header account trigger (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'a phone has no header: the You tab holds the account');

  for (const scheme of ['light', 'dark'] as const) {
    test(`the avatar sits fully inside the trigger and stays centred (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await seedSession(page);
      await page.goto('/links');
      const header = page.getByRole('banner');
      const trigger = header.getByRole('button', { name: 'Account menu' });
      await expect(trigger).toBeVisible();
      const avatar = trigger.locator('ui-avatar');

      const triggerBox = await trigger.boundingBox();
      const avatarBox = await avatar.boundingBox();
      const searchBox = await header.locator('app-header-search').boundingBox();
      expect(triggerBox).not.toBeNull();
      expect(avatarBox).not.toBeNull();
      expect(searchBox).not.toBeNull();
      if (!triggerBox || !avatarBox || !searchBox) {
        return;
      }

      // Fully inside (sub-pixel tolerance), so nothing is clipped.
      expect(avatarBox.y).toBeGreaterThanOrEqual(triggerBox.y - 0.5);
      expect(avatarBox.y + avatarBox.height).toBeLessThanOrEqual(
        triggerBox.y + triggerBox.height + 0.5,
      );
      expect(avatarBox.x).toBeGreaterThanOrEqual(triggerBox.x - 0.5);
      expect(avatarBox.x + avatarBox.width).toBeLessThanOrEqual(
        triggerBox.x + triggerBox.width + 0.5,
      );
      // Centred with the other header controls.
      const centre = (box: { y: number; height: number }): number => box.y + box.height / 2;
      expect(Math.abs(centre(triggerBox) - centre(searchBox))).toBeLessThanOrEqual(1);
      expect(Math.abs(centre(avatarBox) - centre(triggerBox))).toBeLessThanOrEqual(1);
    });
  }
});

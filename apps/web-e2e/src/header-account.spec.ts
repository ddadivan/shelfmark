import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';

test.describe('sidebar head account trigger (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'a phone has no sidebar: the You tab holds the account');

  for (const scheme of ['light', 'dark'] as const) {
    test(`the avatar sits fully inside the trigger and stays centred (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await seedSession(page);
      await page.goto('/links');
      // Shelf: the avatar sits in the sidebar head next to the logo, not in the header.
      const head = page.locator('.shell__side-head');
      const trigger = head.getByRole('button', { name: 'Account menu' });
      await expect(trigger).toBeVisible();
      const avatar = trigger.locator('ui-avatar');

      const triggerBox = await trigger.boundingBox();
      const avatarBox = await avatar.boundingBox();
      const logoBox = await head.locator('.shell__logo').boundingBox();
      expect(triggerBox).not.toBeNull();
      expect(avatarBox).not.toBeNull();
      expect(logoBox).not.toBeNull();
      if (!triggerBox || !avatarBox || !logoBox) {
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
      // Centred with the logo in the same row.
      const centre = (box: { y: number; height: number }): number => box.y + box.height / 2;
      expect(Math.abs(centre(triggerBox) - centre(logoBox))).toBeLessThanOrEqual(1);
      expect(Math.abs(centre(avatarBox) - centre(triggerBox))).toBeLessThanOrEqual(1);
    });
  }
});

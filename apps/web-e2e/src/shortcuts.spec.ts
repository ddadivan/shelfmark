import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';

const DIALOG = 'Keyboard shortcuts';

test.describe('keyboard shortcuts (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
  });

  test('the account menu item opens the list and Esc closes it, focus returns to the account button', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'the sidebar account menu belongs to desktop');
    const button = page.locator('.shell__side-head').getByRole('button', { name: 'Account menu' });

    await button.click();
    await page.getByRole('menuitem', { name: DIALOG }).click();

    const dialog = page.getByRole('dialog', { name: DIALOG });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 3 })).toHaveText([
      'Everywhere',
      'Saving and finding',
      'Link preview',
      'Selecting links',
      'In the folder list',
    ]);
    await expect(dialog.getByRole('listitem').filter({ hasText: 'Search' }).first()).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test('the group panels of the settings page are as tall as their row (#350)', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'the shortcuts page is part of the tablet and desktop settings');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/settings/shortcuts');
    const panels = page.locator('.shortcuts__groups ui-panel');
    // Five groups since the link preview (#553): two full rows, then one panel.
    await expect(panels).toHaveCount(5);
    const boxes = await Promise.all([0, 1, 2, 3].map((i) => panels.nth(i).boundingBox()));
    const [a, b, c, d] = boxes;
    // Two columns: each row's two panels share the top and the height.
    expect(a?.y).toBeCloseTo(b?.y ?? -1, 0);
    expect(a?.height).toBeCloseTo(b?.height ?? -1, 0);
    expect(c?.y).toBeCloseTo(d?.y ?? -1, 0);
    expect(c?.height).toBeCloseTo(d?.height ?? -1, 0);
  });

  test('the list fits a 360px phone as a sheet without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });

    await page.keyboard.press('?');

    const dialog = page.getByRole('dialog', { name: DIALOG });
    await expect(dialog).toBeVisible();
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await dialog.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
  });
});

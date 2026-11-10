import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { isPhone } from './support/sidebar';

const DIALOG = 'Keyboard shortcuts';

test.describe('keyboard shortcuts (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
  });

  test('the top bar button opens the list and Esc closes it, focus returns to the button', async ({
    page,
  }) => {
    test.skip(isPhone(page), 'the top bar belongs to tablet and desktop');
    const button = page.getByRole('banner').getByRole('button', { name: DIALOG });

    await button.click();

    const dialog = page.getByRole('dialog', { name: DIALOG });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 3 })).toHaveText([
      'Everywhere',
      'Saving and finding',
      'In the folder list',
    ]);
    await expect(dialog.getByRole('listitem').filter({ hasText: 'Search' }).first()).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test('the ? key opens the list from anywhere on the page', async ({ page }) => {
    await page.keyboard.press('?');

    await expect(page.getByRole('dialog', { name: DIALOG })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('the ? key is only a character while typing in a field', async ({ page }) => {
    test.skip(isPhone(page), 'the tags are on their own tab on a phone');
    const tags = page.locator('app-sidebar-tags');
    await tags.getByRole('button', { name: 'New tag' }).click();
    const field = tags.getByRole('textbox', { name: 'New tag' });

    await field.pressSequentially('what?');

    await expect(field).toHaveValue('what?');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('the single-key switch turns "?" off at once, keeps the button and survives a reload', async ({
    page,
  }) => {
    test.skip(isPhone(page), 'the shortcuts page is part of the tablet and desktop settings');
    await page.goto('/settings/shortcuts');
    const main = page.getByRole('main');
    const toggle = main.getByRole('switch', { name: 'Use single-key shortcuts' });
    await expect(toggle).toBeChecked();

    await toggle.click();
    await expect(toggle).not.toBeChecked();

    // Applies at once: the very next "?" is ignored (focus is not in a field).
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // The top bar button keeps working.
    const button = page.getByRole('banner').getByRole('button', { name: DIALOG });
    await button.click();
    await expect(page.getByRole('dialog', { name: DIALOG })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Kept on this device.
    await page.reload();
    await expect(main.getByRole('switch', { name: 'Use single-key shortcuts' })).not.toBeChecked();
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await main.getByRole('switch', { name: 'Use single-key shortcuts' }).click();
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: DIALOG })).toBeVisible();
  });

  test('with single-key shortcuts off from the start "?" does nothing', async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem('sm-ui', JSON.stringify({ view: 'cards', singleKeyShortcuts: false })),
    );
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();

    await page.keyboard.press('?');

    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('the settings page lists the shortcuts and opens the dialog from its row', async ({
    page,
  }) => {
    test.skip(isPhone(page), 'the shortcuts page is part of the tablet and desktop settings');
    await page.goto('/settings/shortcuts');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: DIALOG })).toBeVisible();
    await expect(main.getByRole('heading', { level: 2 })).toHaveText([
      DIALOG,
      'Everywhere',
      'Saving and finding',
      'In the folder list',
    ]);

    await main.getByRole('button', { name: 'Open list' }).click();

    await expect(page.getByRole('dialog', { name: DIALOG })).toBeVisible();
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

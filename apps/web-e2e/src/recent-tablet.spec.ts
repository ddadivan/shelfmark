import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';

const TABLET = { width: 800, height: 900 };
const DESKTOP = { width: 1280, height: 900 };

test.describe('Recently opened below 1024px (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'the phone has its own sheet in the menu drawer');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  const toggle = (page: Page) => page.getByRole('button', { name: 'Show recently opened' });
  const panel = (page: Page) => page.getByRole('dialog', { name: 'Recently opened' });

  test('opens as a side panel at 800px, closes with Esc and returns focus', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/links');
    await expect(page.locator('app-recent-links-panel.shell__recent')).toHaveCount(0);

    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByRole('listitem').first()).toBeVisible();
    await expect(page.locator('.ui-dialog-scrim')).toBeVisible();

    // Pinned to the inline-end edge.
    const box = await panel(page).locator('.ui-drawer').boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeCloseTo(TABLET.width, 0);

    // A tooltip on the focused close button swallows the first Esc (it closes only itself).
    await expect(async () => {
      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0, { timeout: 1000 });
    }).toPass();
    await expect(toggle(page)).toBeFocused();
  });

  test('closes with the close button and with the scrim', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/links');

    await toggle(page).click();
    await panel(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page)).toHaveCount(0);

    await toggle(page).click();
    await expect(panel(page)).toBeVisible();
    await page.mouse.click(20, 400);
    await expect(panel(page)).toHaveCount(0);
  });

  test('from 1024px the column is inline and the toggle hides it', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/links');
    await expect(page.locator('app-recent-links-panel.shell__recent')).toBeVisible();
    await page.getByRole('button', { name: 'Hide recently opened' }).click();
    await expect(page.locator('app-recent-links-panel.shell__recent')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('growing past 1024px closes the side panel', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/links');
    await toggle(page).click();
    await expect(panel(page)).toBeVisible();
    await page.setViewportSize(DESKTOP);
    await expect(panel(page)).toHaveCount(0);
    await expect(page.locator('app-recent-links-panel.shell__recent')).toBeVisible();
  });
});

test.describe('Library items skip off-screen work (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('cards and rows use content-visibility: auto', async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    const item = page.locator('.library__list > li').first();
    await expect(item).toBeVisible();
    expect(await item.evaluate((el) => getComputedStyle(el).contentVisibility)).toBe('auto');
  });
});

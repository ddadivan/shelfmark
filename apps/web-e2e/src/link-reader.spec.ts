import { type BrowserContext, type Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { seedSession } from './support/mock-session';
import { isCompact, isPhone } from './support/sidebar';
import { expect, test } from './support/test';
import { openCardMenu } from './support/card-menu';

// Mirror the first MOCK_LINKS entries (libs/shared/contracts); the e2e project cannot import them.
const FIRST = 'Angular overview';
const SECOND = 'Simple pasta';

/** Third-party pages never leave the test machine (as in link-preview.spec.ts). */
async function fakeThirdPartyPages(context: BrowserContext): Promise<void> {
  await context.route(/^https:\/\/(?!localhost|127\.0\.0\.1)/, (route) =>
    route.request().resourceType() === 'document'
      ? route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><title>Third party</title><h1>A third-party page</h1>',
        })
      : route.abort(),
  );
}

async function openLibrary(page: Page): Promise<void> {
  await fakeThirdPartyPages(page.context());
  await seedSession(page);
  await page.goto('/links');
  await expect(page.locator('ui-card').first()).toBeVisible();
}

/** "Preview here" from the card's ⋯ menu (works with touch and with a mouse). */
async function previewFromMenu(page: Page, title: string): Promise<void> {
  await openCardMenu(
    page.locator('app-link-card', { hasText: title }).first(),
    `Actions for ${title}`,
  );
  await page.getByRole('menuitem', { name: /Preview here/ }).click();
}

test.describe('Link page: Reader package (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('full screen covers the window, steps through the feed and leaves with Esc first', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'full screen is the split view (from 80em)');
    await openLibrary(page);
    await previewFromMenu(page, FIRST);
    const panel = page.getByRole('region', { name: `Preview: ${FIRST}` });
    await expect(panel).toBeVisible();

    const full = panel.getByRole('button', { name: 'Full screen' });
    await expect(full).toHaveAttribute('aria-pressed', 'false');
    await full.click();
    const exit = panel.getByRole('button', { name: 'Exit full screen' });
    await expect(exit).toHaveAttribute('aria-pressed', 'true');

    // The whole window: no sidebar, header search or list; the head shows the position.
    const box = await panel.boundingBox();
    const viewport = page.viewportSize();
    expect(box?.x).toBe(0);
    expect(box?.y).toBe(0);
    expect(box?.width).toBe(viewport?.width);
    expect(box?.height).toBe(viewport?.height);
    await expect(page.getByRole('button', { name: 'Add link' })).toBeHidden();
    await expect(page.getByRole('separator', { name: 'Resize the list' })).toHaveCount(0);
    await expect(panel.getByText(/^\s*1 of \d+\s*$/)).toBeVisible();

    // ↓ steps to the next link and full screen stays.
    await page.keyboard.press('ArrowDown');
    const next = page.getByRole('region', { name: `Preview: ${SECOND}` });
    await expect(next).toBeVisible();
    await expect(next.getByText(/^\s*2 of \d+\s*$/)).toBeVisible();
    await expect(next.getByRole('button', { name: 'Exit full screen' })).toBeVisible();

    // F toggles; Esc leaves full screen first, the next Esc closes the Link page.
    await page.keyboard.press('f');
    await expect(next.getByRole('button', { name: 'Full screen' })).toBeVisible();
    await page.keyboard.press('f');
    await expect(next.getByRole('button', { name: 'Exit full screen' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(next.getByRole('button', { name: 'Full screen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add link' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(next).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]preview=/);

    // A new Link page starts without full screen.
    await previewFromMenu(page, FIRST);
    await expect(panel.getByRole('button', { name: 'Full screen' })).toBeVisible();
  });

  test('Reader full screen keeps the reading settings popover', async ({ page }) => {
    test.skip(isCompact(page), 'full screen is the split view (from 80em)');
    await openLibrary(page);
    await previewFromMenu(page, FIRST);
    const panel = page.getByRole('region', { name: `Preview: ${FIRST}` });
    // A click event on the radio itself (the segmented control's label sits over it).
    await panel.getByRole('radio', { name: 'Reader' }).dispatchEvent('click');
    await expect(panel.getByRole('radio', { name: 'Reader' })).toBeChecked();
    await panel.getByRole('button', { name: 'Full screen' }).click();
    await panel.getByRole('button', { name: 'Reading settings' }).click();
    const settings = page.getByRole('dialog', { name: 'Reading settings' });
    await expect(settings).toBeVisible();
    await expect(settings.getByRole('radiogroup', { name: 'Theme' })).toBeVisible();
    // A click event on the radio itself: the tile's swatch and the transparent input overlap.
    await settings.getByRole('radio', { name: 'Sepia' }).dispatchEvent('click');
    await expect(settings.getByRole('radio', { name: 'Sepia' })).toBeChecked();
    await expect(settings.getByRole('slider', { name: 'Text size' })).toHaveValue('18');
    await settings.getByRole('button', { name: 'Larger text' }).click();
    await expect(settings.getByRole('slider', { name: 'Text size' })).toHaveValue('19');
    await expect(panel.locator('ui-reader')).toHaveAttribute('data-reader-theme', 'sepia');
    await settings.getByRole('button', { name: 'Reset' }).click();
    await expect(panel.locator('ui-reader')).not.toHaveAttribute('data-reader-theme', /.+/);
  });

  test(
    'the phone Link page head has two rows; star and Details live in ⋯',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      test.skip(!isPhone(page), 'the two-row head is the phone layout');
      await openLibrary(page);
      await previewFromMenu(page, FIRST);
      const pushed = page.getByRole('dialog', { name: `Preview: ${FIRST}` });
      await expect(pushed).toBeVisible();

      const rows = pushed.locator('.preview-page__head .preview-page__row');
      await expect(rows).toHaveCount(2);
      // Row 1: title and site, ⋯, close.
      await expect(rows.nth(0).getByRole('heading', { name: FIRST })).toBeVisible();
      await expect(rows.nth(0).getByRole('button', { name: 'More actions' })).toBeVisible();
      await expect(rows.nth(0).getByRole('button', { name: 'Close preview' })).toBeVisible();
      // Row 2: Site / Reader, Open (icon), then previous / next on the right.
      await expect(rows.nth(1).getByRole('radiogroup', { name: 'Show as' })).toBeVisible();
      await expect(rows.nth(1).getByRole('button', { name: 'Open in browser' })).toBeVisible();
      const previous = rows.nth(1).getByRole('button', { name: 'Previous link' });
      const next = rows.nth(1).getByRole('button', { name: 'Next link' });
      await expect(previous).toBeVisible();
      await expect(next).toBeVisible();
      const rowBox = await rows.nth(1).boundingBox();
      const nextBox = await next.boundingBox();
      expect((nextBox?.x ?? 0) + (nextBox?.width ?? 0)).toBeGreaterThan(
        (rowBox?.x ?? 0) + (rowBox?.width ?? 0) - 2,
      );
      // No full screen on the phone, and no star or Details in the head.
      await expect(pushed.getByRole('button', { name: 'Full screen' })).toHaveCount(0);
      await expect(
        pushed.locator('.preview-page__head').getByRole('button', { name: 'Favorite' }),
      ).toHaveCount(0);
      await expect(
        pushed.locator('.preview-page__head').getByRole('button', { name: 'Details' }),
      ).toHaveCount(0);

      await rows.nth(0).getByRole('button', { name: 'More actions' }).click();
      await expect(page.getByRole('menuitem', { name: /favorite/i })).toBeVisible();
      await page.getByRole('menuitemcheckbox', { name: 'Details' }).click();
      await expect(pushed.locator('app-preview-details')).toBeVisible();

      // Aa opens Reading settings as a bottom sheet.
      await rows.nth(1).getByRole('radio', { name: 'Reader' }).check();
      await rows.nth(1).getByRole('button', { name: 'Reading settings' }).click();
      const sheet = page.getByRole('dialog', { name: 'Reading settings' });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('heading', { name: 'Reading settings' })).toBeVisible();
    },
  );
});

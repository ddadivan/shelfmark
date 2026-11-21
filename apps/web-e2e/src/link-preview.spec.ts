import { type BrowserContext, type Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';

// Mirror the first MOCK_LINKS entries (libs/shared/contracts); the e2e project cannot import them.
const FIRST = 'Angular overview';
const SECOND = 'Simple pasta';

/**
 * Third-party pages never leave the test machine: a framed document gets a tiny local page, every
 * other outbound request is dropped.
 */
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

/** "Preview here" from the first card's menu (works with touch and with a mouse). */
async function previewFromMenu(page: Page, title: string): Promise<void> {
  await page
    .locator('app-link-card', { hasText: title })
    .first()
    .getByRole('button', { name: `Actions for ${title}` })
    .click();
  await page.getByRole('menuitem', { name: /Preview here/ }).click();
}

test.describe('link preview (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('splits the screen, follows ↑ ↓, survives a reload and closes with Esc', async ({
    page,
  }) => {
    await openLibrary(page);
    const card = page.locator('app-link-card', { hasText: FIRST }).first();
    await card.hover();
    await card.getByRole('button', { name: `Preview ${FIRST}` }).click();

    const panel = page.getByRole('region', { name: `Preview: ${FIRST}` });
    await expect(panel).toBeVisible();
    await expect(page).toHaveURL(/[?&]preview=/);
    // The sidebar stays as it is (no icon rail); the feed keeps its own view.
    await expect(page.getByRole('button', { name: 'Show sidebar' })).toHaveCount(0);
    await expect(page.getByRole('separator', { name: 'Resize the list' })).toBeVisible();
    await expect(page.locator('[aria-current="true"]', { hasText: FIRST })).toBeVisible();

    const frame = panel.locator('iframe');
    await expect(frame).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-popups allow-forms',
    );
    await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect(frame).toHaveAttribute('src', /^https:\/\//);

    await page.locator('body').press('ArrowDown');
    await expect(page.getByRole('region', { name: `Preview: ${SECOND}` })).toBeVisible();
    await expect(page.locator('[aria-current="true"]', { hasText: SECOND })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('region', { name: `Preview: ${SECOND}` })).toBeVisible();

    await page.locator('body').press('Escape');
    await expect(page.getByRole('region', { name: /^Preview:/ })).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]preview=/);
    await expect(page.getByRole('button', { name: 'Show sidebar' })).toHaveCount(0);
  });

  test('resizes the list with the keyboard and hides it with Wider preview', async ({ page }) => {
    await openLibrary(page);
    await previewFromMenu(page, FIRST);
    const handle = page.getByRole('separator', { name: 'Resize the list' });
    // The default width once the split is measured (the window leaves room for it).
    await expect(handle).toHaveAttribute('aria-valuenow', '400');
    const before = 400;
    await handle.focus();
    await handle.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', String(before + 16));

    const panel = page.getByRole('region', { name: `Preview: ${FIRST}` });
    await panel.getByRole('button', { name: 'Wider preview' }).click();
    await expect(handle).toHaveCount(0);
    await panel.getByRole('button', { name: 'Wider preview' }).click();
    await expect(page.getByRole('separator', { name: 'Resize the list' })).toBeVisible();
  });

  test('a site that refuses framing shows the blocked state with Open in new tab', async ({
    page,
  }) => {
    await openLibrary(page);
    await page.getByRole('button', { name: 'Add link' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await dialog.getByLabel('Link', { exact: true }).fill('https://github.com/angular/angular');
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on github.com');
    await dialog.getByRole('button', { name: 'Create link' }).click();
    await expect(dialog).toBeHidden();

    await previewFromMenu(page, 'Page on github.com');
    const panel = page.getByRole('region', { name: 'Preview: Page on github.com' });
    await expect(
      panel.getByRole('heading', { name: "github.com doesn't open inside other apps" }),
    ).toBeVisible();
    await expect(panel.locator('iframe')).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Open in new tab' })).toBeVisible();
    // The click settings are off (#555): no "Always open in a new tab" choice.
    await expect(panel.getByRole('checkbox')).toHaveCount(0);
  });

  test(
    'below 80em the preview is a pushed page with Back',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      test.skip(!isCompact(page), 'the pushed page path is checked on the phone');
      await openLibrary(page);
      await previewFromMenu(page, FIRST);

      const pushed = page.getByRole('dialog', { name: `Preview: ${FIRST}` });
      await expect(pushed).toBeVisible();
      await expect(pushed.locator('iframe')).toHaveAttribute('src', /^https:\/\//);
      await expect(pushed.getByRole('button', { name: 'Share' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: /tabs/i })).toHaveCount(0);

      await pushed.getByRole('button', { name: 'Back to the links' }).click();
      await expect(pushed).toHaveCount(0);
      await expect(page).not.toHaveURL(/[?&]preview=/);
      await expect(page.locator('ui-card').first()).toBeVisible();
    },
  );
});

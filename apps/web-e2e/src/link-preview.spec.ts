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
  // The ⋯ opens out of the star's glass pill on hover (it has no width while shut).
  const card = page.locator('app-link-card', { hasText: title }).first();
  await card.hover();
  await card.getByRole('button', { name: `Actions for ${title}` }).click();
  await page.getByRole('menuitem', { name: /Preview here/ }).click();
}

test.describe('link preview (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('splits the screen, follows ↑ ↓, survives a reload and closes with Esc', async ({
    page,
  }) => {
    await openLibrary(page);
    // Shelf card: no eye button; "Preview here" is the first item of the ⋯ menu.
    await previewFromMenu(page, FIRST);

    const panel = page.getByRole('region', { name: `Preview: ${FIRST}` });
    await expect(panel).toBeVisible();
    await expect(page).toHaveURL(/[?&]preview=/);
    // The sidebar stays as it is (no icon rail); the feed keeps its own view.
    await expect(page.getByRole('button', { name: 'Show sidebar' })).toHaveCount(0);
    await expect(page.getByRole('separator', { name: 'Resize the list' })).toBeVisible();
    await expect(page.locator('[aria-current="true"]', { hasText: FIRST })).toBeVisible();
    // Beside the preview the feed is List rows with the picture (round 11), whatever view the user
    // keeps; the toolbar is slim (title, Filter) and there is no selecting: no Select button, no
    // checkboxes, X does nothing.
    await expect(page.locator('.library__rows--headlines')).toHaveCount(0);
    await expect(page.locator('.library__item ui-list-item').first()).toBeVisible();
    await expect(page.locator('.library__grid')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Filter', exact: true })).toBeVisible();
    for (const name of ['Select links', 'Save view', 'Side by side']) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole('radio', { name: 'Headlines', exact: true })).toHaveCount(0);
    await expect(page.locator('.library__item ui-checkbox')).toHaveCount(0);
    await page.evaluate('document.activeElement?.blur()');
    await page.locator('body').press('x');
    await expect(page.getByRole('toolbar', { name: /selected/ })).toHaveCount(0);

    const frame = panel.locator('iframe');
    await expect(frame).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-popups allow-forms',
    );
    await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect(frame).toHaveAttribute('src', /^https:\/\//);

    // After the menu closes the focus is back on the card's ⋯ button, where ↓ opens the menu
    // again: nothing focused is where ↑ ↓ follow the list.
    await page.evaluate('document.activeElement?.blur()');
    await page.locator('body').press('ArrowDown');
    await expect(page.getByRole('region', { name: `Preview: ${SECOND}` })).toBeVisible();
    await expect(page.locator('[aria-current="true"]', { hasText: SECOND })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('region', { name: `Preview: ${SECOND}` })).toBeVisible();

    await page.locator('body').press('Escape');
    await expect(page.getByRole('region', { name: /^Preview:/ })).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]preview=/);
    await expect(page.getByRole('button', { name: 'Show sidebar' })).toHaveCount(0);
    // The user's own view is back: Cards (the default) draws the grid again.
    await expect(page.locator('.library__grid')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select links', exact: true })).toBeVisible();
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

    // "Wider preview" is its own toolbar button (not in the ⋯ menu); pressed, it reads "Narrower preview".
    const panel = page.getByRole('region', { name: `Preview: ${FIRST}` });
    await panel.getByRole('button', { name: 'Wider preview' }).click();
    await expect(handle).toHaveCount(0);
    await panel.getByRole('button', { name: 'Narrower preview' }).click();
    await expect(page.getByRole('separator', { name: 'Resize the list' })).toBeVisible();
  });

  test('a site that refuses framing shows the blocked state and stays off the new-tab sites', async ({
    page,
  }) => {
    await openLibrary(page);
    await page.getByRole('button', { name: 'Add link' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await dialog.getByLabel('Link', { exact: true }).fill('https://github.com/angular/angular');
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on github.com');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();

    await previewFromMenu(page, 'Page on github.com');
    const panel = page.getByRole('region', { name: 'Preview: Page on github.com' });
    await expect(
      panel.getByRole('heading', { name: "github.com doesn't allow showing it here" }),
    ).toBeVisible();
    await expect(panel.locator('iframe')).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Open in browser' }).last()).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Open in Reader' })).toBeVisible();
    // Only the user adds a site to the new-tab list (#555): the check leaves it unticked.
    await expect(
      panel.getByRole('checkbox', { name: 'Always open github.com in a new tab' }),
    ).not.toBeChecked();
  });

  test(
    'a tap on a card opens the full-screen preview on the phone, never a new tab (#572)',
    { tag: E2E_TAG.Phone },
    async ({ page, context }) => {
      test.skip(!isCompact(page), 'the pushed page path is checked on the phone');
      await openLibrary(page);
      const opened: string[] = [];
      context.on('page', (other) => opened.push(other.url()));
      await page
        .locator('app-link-card', { hasText: FIRST })
        .first()
        .getByRole('link')
        .first()
        .tap();

      const pushed = page.getByRole('dialog', { name: `Preview: ${FIRST}` });
      await expect(pushed).toBeVisible();
      await expect(page).toHaveURL(/[?&]preview=/);
      expect(opened).toEqual([]);
    },
  );

  test(
    'below 80em the preview is a pushed page with Close',
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

      await pushed.getByRole('button', { name: 'Close preview' }).click();
      await expect(pushed).toHaveCount(0);
      await expect(page).not.toHaveURL(/[?&]preview=/);
      await expect(page.locator('ui-card').first()).toBeVisible();
    },
  );
});

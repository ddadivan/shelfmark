import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';

// Mirror MOCK_LINKS_SCENARIO_KEY and MOCK_LINKS_SCENARIO (apps/web links models); the e2e project
// cannot import from apps/web.
const SCENARIO_KEY = 'sm-mock-links-scenario';
const SCENARIO = { empty: 'empty', error: 'error' } as const;
const PHONE_PROJECT = 'phone';
// The mock page size is 50 of 60 links.
const FIRST_PAGE = 50;
const ALL_LINKS = 60;

test.describe('links feed (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  async function openFeed(page: Page, path = '/links') {
    await page.goto(path);
    await expect(page.locator('ui-card').first()).toBeVisible();
  }

  async function firstTitle(page: Page): Promise<string> {
    return page.locator('ui-card').first().getByRole('heading').innerText();
  }

  test('shows the cards, the count and "load more" on the first page', async ({ page }) => {
    await openFeed(page);

    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    await expect(page.locator('ui-card')).toHaveCount(FIRST_PAGE);
    await expect(page.getByText(`${FIRST_PAGE}+ links`)).toBeVisible();
  });

  test('loads the rest when the end of the list is reached', async ({ page }) => {
    await openFeed(page);

    await page.keyboard.press('End');

    await expect(page.locator('ui-card')).toHaveCount(ALL_LINKS);
    await expect(page.getByText(`${ALL_LINKS} links`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  });

  test('switches to the list view and remembers it after a reload', async ({ page }) => {
    await openFeed(page);

    await page.getByRole('radio', { name: 'List' }).click();
    await expect(page.locator('ui-list-item').first()).toBeVisible();
    await expect(page.locator('ui-card')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('ui-list-item').first()).toBeVisible();
  });

  test('toggles a favorite and keeps it', async ({ page }) => {
    await openFeed(page);
    const favorite = page
      .locator('ui-card')
      .first()
      .getByRole('button', { name: /^Favorite: / });
    const before = await favorite.getAttribute('aria-pressed');

    await favorite.click();

    await expect(favorite).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  });

  test('rolls a favorite back and offers Retry when the request fails', async ({ page }) => {
    await openFeed(page);
    await page.getByRole('button', { name: 'Add link' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await dialog.getByLabel('Link', { exact: true }).fill('https://patch-fails.example/x');
    await dialog.getByRole('button', { name: /Save/ }).click();
    await expect(dialog).toBeHidden();

    const favorite = page
      .locator('ui-card')
      .first()
      .getByRole('button', { name: /^Favorite: / });
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
    await favorite.click();

    await expect(page.getByText("Couldn't update the favorite.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  });

  test('deleting asks first, removes the card and Undo brings it back', async ({ page }) => {
    await openFeed(page);
    const title = await firstTitle(page);

    await page
      .locator('ui-card')
      .first()
      .getByRole('button', { name: /^Actions for / })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText('will be deleted');
    await confirm.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
    await expect(page.getByText('Link deleted')).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  });

  test('cancelling the confirmation keeps the link', async ({ page }) => {
    await openFeed(page);
    const title = await firstTitle(page);

    await page
      .locator('ui-card')
      .first()
      .getByRole('button', { name: /^Actions for / })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  });

  test('a link saved from the header appears at the top', async ({ page }) => {
    await openFeed(page);

    await page.getByRole('button', { name: 'Add link' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await dialog.getByLabel('Link', { exact: true }).fill('https://example.org/post');
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on example.org');
    await dialog.getByRole('button', { name: 'Save link' }).click();

    await expect(page.getByText('Link saved')).toBeVisible();
    await expect(page.locator('ui-card').first()).toContainText('Page on example.org');
  });

  test('the favorites page lists favorites only', async ({ page }) => {
    await openFeed(page, '/favorites');

    await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
    const buttons = page.locator('ui-card').getByRole('button', { name: /^Favorite: / });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(buttons.nth(i)).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('the unsorted page has its own heading', async ({ page }) => {
    await openFeed(page, '/unsorted');

    await expect(page.getByRole('heading', { level: 1, name: 'Unsorted' })).toBeVisible();
  });

  test('shows the empty state', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [SCENARIO_KEY, SCENARIO.empty],
    );
    await page.goto('/links');

    await expect(page.getByRole('heading', { name: 'No links here yet' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add link' })).toHaveCount(2);
  });

  test('shows the error state', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [SCENARIO_KEY, SCENARIO.error],
    );
    await page.goto('/links');

    await expect(page.getByRole('heading', { name: "Couldn't load your links" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('the recent panel exists on a wide screen only', async ({ page }, testInfo) => {
    await openFeed(page);

    const panel = page.getByRole('heading', { name: 'Recently opened' });
    if (testInfo.project.name === PHONE_PROJECT) {
      await expect(panel).toBeHidden();
    } else {
      await expect(panel).toBeVisible();
      await expect(page.locator('app-recent-links-panel a').first()).toBeVisible();
      await page.getByRole('button', { name: 'Hide recently opened' }).click();
      await expect(panel).toBeHidden();
    }
  });

  test('fits the viewport without horizontal scroll', async ({ page }) => {
    await openFeed(page);

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test(`has no axe violations in the cards view (${colorScheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await openFeed(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);

      // The account menu trigger is named "Account menu" but its avatar initials count as text.
      await expectNoBlockingViolations(page, testInfo, {
        disabledRules: ['label-content-name-mismatch'],
      });
    });

    test(`has no axe violations in the list view (${colorScheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await openFeed(page);
      await page.getByRole('radio', { name: 'List' }).click();
      await expect(page.locator('ui-list-item').first()).toBeVisible();

      await expectNoBlockingViolations(page, testInfo, {
        disabledRules: ['label-content-name-mismatch'],
      });
    });
  }
});

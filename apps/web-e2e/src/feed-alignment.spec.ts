import { type Locator, type Page } from '@playwright/test';
import { switchView } from './support/library-toolbar';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';

// Mirror MOCK_ID.FolderAngular (libs/shared/contracts): a folder with only a few links.
const ANGULAR_FOLDER = '/folders/00000000-0000-4000-8000-000000000102';

async function right(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  return (box?.x ?? 0) + (box?.width ?? 0);
}

/** The right edge of the feed's rightmost card or row. */
async function feedRight(page: Page, item: string): Promise<number> {
  const rights = await page
    .locator(item)
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
  return Math.max(...rights);
}

function overflows(page: Page): Promise<boolean> {
  return page.locator('.library__scroll').evaluate((el) => el.scrollHeight > el.clientHeight + 1);
}

// #352 item 10: the feed lines up with the page header; the scrollbar sits outside that line,
// in the page margin, its gutter always reserved (no jump when it appears).
test.describe('feed alignment (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'desktop: the feed is its own scroll area');

  for (const width of [1024, 1280, 1440, 1920]) {
    test(`cards and rows end on the header's right edge at ${width}px, short or long`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await seedSession(page);
      test.skip(isCompact(page), 'the mobile shell has no feed scroll area');

      // A short feed (no scrollbar) and the long one: same edge, same x.
      await page.goto(ANGULAR_FOLDER);
      await expect(page.locator('ui-card').first()).toBeVisible();
      await settled(page);
      expect(await overflows(page)).toBe(false);
      const header = page.locator('.library__toolbar');
      const shortX = (await page.locator('ui-card').first().boundingBox())?.x ?? 0;
      // A few cards do not fill the row: the grid itself ends on the header's edge.
      const grid = page.locator('.library__grid').first();
      expect(Math.abs((await right(grid)) - (await right(header)))).toBeLessThanOrEqual(1);

      await page.goto('/links');
      await expect(page.locator('ui-card').first()).toBeVisible();
      await settled(page);
      expect(await overflows(page)).toBe(true);
      expect(
        Math.abs((await feedRight(page, 'ui-card')) - (await right(header))),
      ).toBeLessThanOrEqual(1);
      expect((await page.locator('ui-card').first().boundingBox())?.x ?? 0).toBeCloseTo(shortX, 0);
      // The scrollbar is outside the header line.
      expect(await right(page.locator('.library__scroll'))).toBeGreaterThan(await right(header));

      await switchView(page, 'List');
      await expect(page.locator('ui-list-item').first()).toBeVisible();
      expect(
        Math.abs((await feedRight(page, 'ui-list-item')) - (await right(header))),
      ).toBeLessThanOrEqual(1);
    });
  }

  test('the bulk bar and its toast stay centred on the cards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedSession(page);
    await page.goto('/links');
    const first = page.locator('ui-card').first();
    await first.hover();
    await first.locator('ui-checkbox .ui-checkbox__box').click();
    await page
      .getByRole('toolbar', { name: /^Actions for/ })
      .getByRole('button', { name: 'Favorite', exact: true })
      .click();
    const toast = page.locator('ui-toast').first();
    await expect(toast).toBeVisible();
    await settled(page);

    const left = (await page.locator('.library__toolbar').boundingBox())?.x ?? 0;
    const content = { from: left, to: await right(page.locator('.library__toolbar')) };
    const centre = (content.from + content.to) / 2;
    const middle = async (locator: Locator) => {
      const box = await locator.boundingBox();
      return (box?.x ?? 0) + (box?.width ?? 0) / 2;
    };
    expect(Math.abs((await middle(page.locator('ui-bulk-bar'))) - centre)).toBeLessThanOrEqual(1);
    expect(Math.abs((await middle(toast)) - centre)).toBeLessThanOrEqual(1);
  });
});

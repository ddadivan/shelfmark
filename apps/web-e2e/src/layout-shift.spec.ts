import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { openSidebar, viewEntry } from './support/sidebar';

// Mirrors MOCK_NAME.FolderReading (apps/web and libs/shared/contracts); the e2e project cannot
// import from them.
const READING = 'Reading';

interface Shift {
  value: number;
  /** Whether a node outside the sidebar moved. */
  inPage: boolean;
}

/**
 * Records every layout shift from the start of the page (before the app runs). The folder tree
 * opens and closes on a click of its row (user-made, and not part of the library page), so a
 * shift that only moves nodes inside the sidebar or the drawer is marked `inPage: false`;
 * everything else that moves counts.
 */
async function recordShifts(page: Page): Promise<void> {
  await page.addInitScript(`
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const inPage = entry.sources.some((source) => {
          const node = source.node;
          const element = node instanceof Element ? node : node?.parentElement;
          return !element?.closest('app-sidebar, app-mobile-nav, .ui-drawer');
        });
        window.__shifts.push({ value: entry.value, inPage });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  `);
}

async function takeShifts(page: Page): Promise<Shift[]> {
  return page.evaluate<Shift[]>('window.__shifts.splice(0)');
}

test.describe('library view switch (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await recordShifts(page);
  });

  test('moves nothing when switching between all links, unsorted, favorites and a folder', async ({
    page,
  }) => {
    await page.goto('/links');
    await expect(page.locator('app-link-card').first()).toBeVisible();
    await page.waitForTimeout(500);
    // Whatever moved while the first page and the sidebar loaded is not what is measured.
    await takeShifts(page);

    const views: Array<[row: string, title: string]> = [
      ['Unsorted', 'Unsorted'],
      ['Favorites', 'Favorites'],
      [READING, READING],
      ['All links', 'All links'],
      ['Unsorted', 'Unsorted'],
    ];
    for (const [row, title] of views) {
      await openSidebar(page);
      await (
        row === READING
          ? page.getByRole('treeitem', { name: new RegExp(`^${row}\\b`) })
          : viewEntry(page, row)
      ).click();
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.locator('ui-skeleton')).toHaveCount(0);
      await expect(page.locator('app-link-card').first()).toBeVisible();
      // Late shifts (fonts, the count) show up a few frames after the list.
      await page.waitForTimeout(300);
    }

    const moved = (await takeShifts(page)).filter((shift) => shift.inPage);
    expect(moved).toEqual([]);
  });
});

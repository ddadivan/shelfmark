import { seedSession } from './support/mock-session';
import { makePageTall, mainScrollTop, scrollMainTo } from './support/scroll';
import { isCompact, openSidebar, tabBar } from './support/sidebar';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';

// Mirror MOCK_ID.FolderReading and its name (apps/web); the e2e project cannot import from it.
const READING = { id: '00000000-0000-4000-8000-000000000101', name: 'Reading' };
/** Scroll positions may land a few pixels off (rounding, the root font size). */
const TOLERANCE_PX = 4;

// #352: the mobile shell scrolls its main column, not the document, so the router's own window
// restoration does nothing there. `ScrollRestorationDirective` stores the column's position per
// navigation: Back and Forward put it back, a new page starts at the top.
test.describe('scroll restoration in the mobile shell (mock API)', { tag: E2E_TAG.Phone }, () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    test.skip(!isCompact(page), 'the mobile shell: the tablet and phone projects');
    await seedSession(page);
  });

  test('Back from a folder puts the Library page where it was; Forward opens the folder at the top', async ({
    page,
  }) => {
    await page.goto('/links');
    await openSidebar(page);
    await makePageTall(page, 3000);
    await scrollMainTo(page, 600);
    await expect.poll(() => mainScrollTop(page)).toBe(600);
    // The tree focuses the folder on activation, which scrolls it into view: focus it first, so the
    // position left behind is known, then open it.
    const folder = page.getByRole('treeitem', { name: new RegExp(`^${READING.name}\\b`) });
    await folder.focus();
    const before = await mainScrollTop(page);
    expect(before).toBeGreaterThan(100);

    await folder.dispatchEvent('click');
    await expect(page).toHaveURL(`/folders/${READING.id}`);
    await expect(page.getByRole('heading', { level: 1, name: READING.name })).toBeVisible();
    await expect.poll(() => mainScrollTop(page)).toBe(0);

    await page.goBack();
    await expect(page).toHaveURL('/library');
    await expect
      .poll(async () => Math.abs((await mainScrollTop(page)) - before))
      .toBeLessThanOrEqual(TOLERANCE_PX);

    await page.goForward();
    await expect(page).toHaveURL(`/folders/${READING.id}`);
    await expect.poll(() => mainScrollTop(page)).toBe(0);
  });

  test('Back from another tab restores the scrolled feed', async ({ page }) => {
    await page.goto('/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
    await makePageTall(page, 3000);
    await scrollMainTo(page, 900);
    await expect.poll(() => mainScrollTop(page)).toBe(900);

    await tabBar(page).getByRole('link', { name: 'Tags' }).click();
    await expect(page).toHaveURL('/tags');
    await expect.poll(() => mainScrollTop(page)).toBe(0);

    await page.goBack();
    await expect(page).toHaveURL('/links');
    await expect(page.locator('ui-card').first()).toBeAttached();
    await expect
      .poll(async () => Math.abs((await mainScrollTop(page)) - 900))
      .toBeLessThanOrEqual(TOLERANCE_PX);
  });
});

import { type Locator, type Page } from '@playwright/test';
import { pickFolderMenuItem } from './support/a11y-flows';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isCompact } from './support/sidebar';
import { switchView } from './support/library-toolbar';

// Mirror MOCK_LINKS ("Simple pasta" is unsorted, "Angular overview" is in Angular) and the
// MOCK_FOLDERS names (libs/shared/contracts); the e2e project cannot import from them.
const PASTA = 'Simple pasta';
const READING = 'Reading';
const ANGULAR_ID = '00000000-0000-4000-8000-000000000102';

const treeRow = (page: Page, name: string) =>
  page.getByRole('treeitem', { name: new RegExp(`^${name}\\b`) });

/** Presses on `source`, moves in small steps (the CDK needs a few moves to start) and hovers `target`. */
async function dragOver(page: Page, source: Locator, target: Locator): Promise<void> {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) {
    throw new Error('drag source or target is not visible');
  }
  await page.mouse.move(from.x + from.width / 2, from.y + 24);
  await page.mouse.down();
  for (let step = 1; step <= 10; step++) {
    await page.mouse.move(
      from.x + from.width / 2 + ((to.x + to.width / 2 - from.x - from.width / 2) * step) / 10,
      from.y + 24 + ((to.y + to.height / 2 - from.y - 24) * step) / 10,
    );
  }
}

test.describe('drag a link to a folder (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/unsorted');
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
  });

  test('dropping a card on a sidebar folder moves it, and Undo brings it back', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'phones have no sidebar; "Move to folder" is the way there');
    const card = page.locator('li.library__item').filter({ hasText: PASTA });
    const reading = treeRow(page, READING);
    const tags = page.locator('app-sidebar-tags');
    await expect(tags).toBeVisible();
    const tagsTop = (await tags.boundingBox())?.y ?? 0;
    const readingHeight = (await reading.boundingBox())?.height ?? 0;

    await dragOver(page, card, reading);
    await expect(reading).toHaveClass(/ui-tree__row--drop/);
    await expect(reading).toContainText('Move here');
    // The "Move here" hint fits in the row: neither the row nor the Tags section below moves.
    expect(Math.abs(((await tags.boundingBox())?.y ?? 0) - tagsTop)).toBeLessThanOrEqual(0.5);
    expect(
      Math.abs(((await reading.boundingBox())?.height ?? 0) - readingHeight),
    ).toBeLessThanOrEqual(0.5);
    const slot = page.locator('.library__drag-slot');
    await expect(slot).toContainText('Moving');
    await expect(slot).toContainText(PASTA);
    await page.mouse.up();

    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);
    const toast = page.getByRole('status').filter({ hasText: `Moved to ${READING}` });
    await expect(toast).toContainText(PASTA);
    await expect(reading).not.toHaveClass(/ui-tree__row--drop/);

    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
  });

  test('a pinned folder takes the card like the folder tree; rows that cannot take it are muted (#335)', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'phones have no sidebar; "Move to folder" is the way there');
    await pickFolderMenuItem(page, READING, 'Pin to sidebar');
    const pinned = page.locator('app-sidebar-pinned .pinned__item').filter({ hasText: READING });
    await expect(pinned).toBeVisible();
    const card = page.locator('li.library__item').filter({ hasText: PASTA });
    const allLinks = treeRow(page, 'All links');

    await dragOver(page, card, pinned);
    await expect(pinned).toHaveClass(/pinned__item--drop/);
    await expect(pinned).toContainText('Move here');
    // All links, Favorites and Recently opened cannot take a link: muted, no-drop cursor, no highlight.
    await expect(allLinks).toHaveClass(/ui-tree__row--no-drop/);
    await expect(allLinks).not.toHaveClass(/ui-tree__row--drop\b/);
    await expect(allLinks).toHaveCSS('cursor', 'no-drop');
    await expect(treeRow(page, 'Favorites')).toHaveClass(/ui-tree__row--no-drop/);
    await expect(treeRow(page, 'Unsorted')).not.toHaveClass(/ui-tree__row--no-drop/);
    await page.mouse.up();

    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: `Moved to ${READING}` })).toBeVisible();
    await expect(allLinks).not.toHaveClass(/ui-tree__row--no-drop/);
  });

  test('rows that cannot take a link are dimmed, a toast says why once, and a drop does nothing (#350)', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'phones have no sidebar; "Move to folder" is the way there');
    const card = page.locator('li.library__item').filter({ hasText: PASTA });
    const favorites = treeRow(page, 'Favorites');
    const reason = page
      .getByRole('status')
      .filter({ hasText: "Can't drop here — star a link to add it to Favorites" });

    await dragOver(page, card, favorites);
    await expect(favorites).toHaveClass(/ui-tree__row--no-drop/);
    await expect(favorites).toHaveAttribute('aria-disabled', 'true');
    await expect(favorites.locator('.ui-tree__name')).toHaveCSS('opacity', '0.5');
    // No badge in the row (it truncated the name): the reason is one info toast.
    await expect(favorites.locator('.ui-tree__drop-badge')).toHaveCount(0);
    await expect(reason).toHaveCount(1);
    await expect(favorites).not.toHaveClass(/ui-tree__row--drop\b/);

    // Moving within the row, or leaving it and coming back, does not show it again.
    const box = await favorites.boundingBox();
    if (!box) {
      throw new Error('Favorites is not visible');
    }
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width + 300, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(reason).toHaveCount(1);

    await page.mouse.up();
    // Nothing moved: the card is still here, the row is back to normal, the toast is gone.
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
    await expect(favorites).not.toHaveClass(/ui-tree__row--no-drop/);
    await expect(favorites).not.toHaveAttribute('aria-disabled', 'true');
    await expect(reason).toHaveCount(0);
  });

  test('dragging a picked card carries every picked card, with one toast and Undo', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'phones have no sidebar; "Move to folder" is the way there');
    await page.goto('/links');
    const items = page.locator('li.library__item');
    await expect(items.first()).toBeVisible();
    const reading = treeRow(page, READING);
    for (const index of [0, 1, 2]) {
      const card = items.nth(index).locator('ui-card');
      await card.hover();
      await card.locator('.ui-checkbox__box').click();
    }
    await settled(page);
    // The cards are tall and few per row (#335): picking the third scrolled the grabbed one away.
    await items.nth(1).scrollIntoViewIfNeeded();
    await settled(page);
    const boxes = await Promise.all([0, 1, 2].map((index) => items.nth(index).boundingBox()));

    await dragOver(page, items.nth(1), reading);
    await expect(reading).toHaveClass(/ui-tree__row--drop/);
    await expect(page.locator('.cdk-drag-preview .library__drag-badge')).toHaveText('Move 3 links');
    // All three picked cards show the same "Moving" slot (the grabbed one as the placeholder), at
    // the size they had: nothing in the grid reflows.
    const slots = page.locator('ul.library__grid app-drag-slot');
    await expect(slots).toHaveCount(3);
    for (const index of [0, 1, 2]) {
      await expect(slots.nth(index)).toContainText('Moving');
      const slotBox = await slots.nth(index).boundingBox();
      expect(slotBox?.width).toBeCloseTo(boxes[index]?.width ?? 0, 0);
      expect(slotBox?.height).toBeCloseTo(boxes[index]?.height ?? 0, 0);
    }
    // Three cards dragged: the preview and two behind it (a deck of three, #350).
    await expect(page.locator('.cdk-drag-preview .library__drag-stack')).toHaveCount(2);
    // The move is announced.
    await expect(page.locator('li.library__item--carried')).not.toHaveCount(0);
    await expect(page.locator('.library__live')).toContainText('Moving 3 links');
    await page.mouse.up();
    await expect(page.locator('li.library__item--carried')).toHaveCount(0);

    // Some of the picked links may already live in Reading; only the others move.
    const toast = page
      .getByRole('status')
      .filter({ hasText: new RegExp(`\\d links? moved to ${READING}`) });
    await expect(toast).toBeVisible();
    await expect(page.getByRole('group', { name: 'Selection' })).toHaveCount(0);
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(toast).toHaveCount(0);
  });

  test('dragging an unselected card moves just that card', async ({ page }) => {
    test.skip(isCompact(page), 'phones have no sidebar');
    await page.goto('/links');
    const items = page.locator('li.library__item');
    await expect(items.first()).toBeVisible();
    const first = items.nth(0).locator('ui-card');
    await first.hover();
    await first.locator('.ui-checkbox__box').click();
    await settled(page);

    await dragOver(page, items.nth(1), treeRow(page, READING));
    await expect(page.locator('.cdk-drag-preview .library__drag-badge')).toHaveText('Move 1 link');
    await expect(page.locator('.cdk-drag-preview .library__drag-stack')).toHaveCount(0);
    await page.mouse.up();

    await expect(page.getByRole('status').filter({ hasText: `Moved to ${READING}` })).toBeVisible();
  });

  test('Esc cancels the drag and nothing moves', async ({ page }) => {
    test.skip(isCompact(page), 'phones have no sidebar');
    const card = page.locator('li.library__item').filter({ hasText: PASTA });
    const reading = treeRow(page, READING);

    await dragOver(page, card, reading);
    await expect(reading).toHaveClass(/ui-tree__row--drop/);
    await page.keyboard.press('Escape');
    await expect(reading).not.toHaveClass(/ui-tree__row--drop/);
    await page.mouse.up();
    await expect(page.locator('.cdk-drag-preview')).toHaveCount(0);

    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
    await expect(page.getByText(`Moved to ${READING}`)).toHaveCount(0);
  });

  test('works from a row in the list view, dropped on a subfolder-free folder row', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'phones have no sidebar');
    await switchView(page, 'List');
    const row = page.locator('li.library__item').filter({ hasText: PASTA });
    await expect(row.locator('ui-list-item')).toBeVisible();
    await settled(page);

    const rowBox = await row.boundingBox();

    await dragOver(page, row, treeRow(page, READING));
    await expect(page.locator('.cdk-drag-preview')).toBeVisible();
    // The row leaves a one-line "Moving · title" slot of its own height.
    const slot = page.locator('ul.library__rows .library__drag-slot');
    await expect(slot).toHaveClass(/drag-slot--compact/);
    await expect(slot).toContainText('Moving');
    await expect(slot).toContainText(PASTA);
    expect((await slot.boundingBox())?.height).toBeCloseTo(rowBox?.height ?? 0, 0);
    await page.mouse.up();

    await expect(page.getByRole('status').filter({ hasText: `Moved to ${READING}` })).toBeVisible();
  });

  test('a link cannot be dragged on a phone', async ({ page }) => {
    test.skip(!isCompact(page), 'phone only');
    const card = page.locator('li.library__item').filter({ hasText: PASTA });

    await expect(card).toHaveClass(/cdk-drag-disabled/);
  });

  test('dropping on the folder the link is in does nothing', async ({ page }) => {
    test.skip(isCompact(page), 'phones have no sidebar');
    await page.goto(`/folders/${ANGULAR_ID}`);
    const card = page.locator('li.library__item').first();
    await expect(card).toBeVisible();
    const angular = treeRow(page, 'Angular');

    await dragOver(page, card, angular);
    await expect(angular).not.toHaveClass(/ui-tree__row--drop/);
    await page.mouse.up();

    await expect(page.getByText(/^Moved to/)).toHaveCount(0);
  });
});

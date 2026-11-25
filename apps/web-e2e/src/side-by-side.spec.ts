import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { documentScrollTop, mainScrollTop } from './support/scroll';
import { isCompact } from './support/sidebar';
import { sideBySideItem, toggleSideBySide } from './support/library-toolbar';

// Mirror MOCK_LINKS ("Simple pasta" is unsorted) and the MOCK_FOLDERS names (libs/shared/contracts);
// the e2e project cannot import from them.
const PASTA = 'Simple pasta';
const READING = 'Reading';
const LEFT_SCROLL = '.library__scroll';
const RIGHT_SCROLL = '.split-right__scroll';

/** Opens `/links` side by side with the Reading folder on the right. */
async function openWithReading(page: Page): Promise<Locator> {
  await seedSession(page);
  await page.goto('/links');
  await expect(page.locator('ui-card').first()).toBeVisible();
  await toggleSideBySide(page);
  const right = page.getByRole('region', { name: 'Right: choose a folder' });
  await right.getByRole('option', { name: READING, exact: true }).click();
  const rightHalf = page.getByRole('region', { name: `Right: ${READING}` });
  await expect(rightHalf.locator('ui-card').first()).toBeVisible();
  return rightHalf;
}

function scrollTop(page: Page, selector: string): Promise<number> {
  return page.evaluate<number>(`document.querySelector('${selector}').scrollTop`);
}

async function wheelOver(page: Page, area: Locator, deltaY: number): Promise<void> {
  const box = await area.boundingBox();
  if (!box) {
    throw new Error('the scroll area is not visible');
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, deltaY);
}

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

test.describe('side by side (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('opens, moves a card into the right folder, undoes it, survives a reload and closes with Back', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'side by side starts at 80em');
    await seedSession(page);
    await page.goto('/unsorted');
    const pasta = page.getByRole('heading', { name: PASTA, exact: true });
    await expect(pasta).toBeVisible();

    await toggleSideBySide(page);
    const right = page.getByRole('region', { name: 'Right: choose a folder' });
    await expect(right.getByText('Choose a folder to move links into')).toBeVisible();
    await expect(page).toHaveURL(/[?&]split=(&|$)/);

    await right.getByRole('option', { name: READING, exact: true }).click();
    await expect(page).toHaveURL(/split=[0-9a-f-]{36}/);
    const rightHalf = page.getByRole('region', { name: `Right: ${READING}` });
    await expect(rightHalf).toBeVisible();
    await expect(rightHalf.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);

    const card = page.locator('li.library__item').filter({ hasText: PASTA });
    await dragOver(page, card, rightHalf);
    await expect(rightHalf).toContainText('Move here');
    await page.mouse.up();

    await expect(page.locator('li.library__item').filter({ hasText: PASTA })).toHaveCount(0);
    await expect(rightHalf.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
    const toast = page.getByRole('status').filter({ hasText: `Moved to ${READING}` });
    await expect(toast).toContainText(PASTA);

    // The toast centres on both halves (the right half starts at the divider), not on the left feed.
    await expect(page.locator('.ui-toast__folder')).toBeVisible();
    const toastBox = await page.locator('ui-toast').filter({ hasText: PASTA }).boundingBox();
    const dividerBox = await rightHalf.boundingBox();
    if (!toastBox || !dividerBox) {
      throw new Error('the toast or the divider is not visible');
    }
    expect(Math.abs(toastBox.x + toastBox.width / 2 - dividerBox.x)).toBeLessThan(12);

    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('li.library__item').filter({ hasText: PASTA })).toHaveCount(1);
    await expect(rightHalf.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/split=[0-9a-f-]{36}/);
    await expect(page.getByRole('region', { name: `Right: ${READING}` })).toBeVisible();

    // The first choice replaced the empty picker entry, so one Back closes the split.
    await page.goBack();
    await expect(page).not.toHaveURL(/split=/);
    await expect(page.getByRole('region', { name: /^Right:/ })).toHaveCount(0);
    await expect(sideBySideItem(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('each half scrolls on its own, the page does not, and the left one loads more', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'side by side starts at 80em');
    const rightHalf = await openWithReading(page);
    const left = page.locator(LEFT_SCROLL);
    const right = page.locator(RIGHT_SCROLL);
    const leftTrigger = page.getByRole('button', { name: /^Left feed:/ });
    const rightTrigger = page.getByRole('button', { name: /^Right folder:/ });

    await wheelOver(page, left, 900);
    await expect.poll(() => scrollTop(page, LEFT_SCROLL)).toBeGreaterThan(200);
    expect(await scrollTop(page, RIGHT_SCROLL)).toBe(0);

    await wheelOver(page, right, 500);
    await expect.poll(() => scrollTop(page, RIGHT_SCROLL)).toBeGreaterThan(200);
    const leftAt = await scrollTop(page, LEFT_SCROLL);
    await wheelOver(page, right, 300);
    await expect.poll(() => scrollTop(page, RIGHT_SCROLL)).toBeGreaterThan(500);
    expect(await scrollTop(page, LEFT_SCROLL)).toBe(leftAt);

    // The document and the shell's main column stay where they are; both headers stay on screen.
    expect(await documentScrollTop(page)).toBe(0);
    expect(await mainScrollTop(page)).toBe(0);
    await expect(leftTrigger).toBeInViewport();
    await expect(rightTrigger).toBeInViewport();
    await expect(rightHalf).toBeVisible();

    // The first page of the left feed holds 50 of the 60 links: the end of it loads the rest.
    await expect(left.locator('ui-card')).toHaveCount(50);
    await page.evaluate(`document.querySelector('${LEFT_SCROLL}').scrollTo(0, 1e6)`);
    await expect(left.locator('ui-card')).toHaveCount(60);
    expect(await documentScrollTop(page)).toBe(0);
  });

  test('lists the recently used folders on top of the picker', async ({ page }) => {
    test.skip(isCompact(page), 'side by side starts at 80em');
    await openWithReading(page);

    await page.getByRole('button', { name: /^Right folder:/ }).click();
    const menu = page.getByRole('dialog', { name: 'Show on the right' });
    await expect(menu.getByText('Recent', { exact: true })).toBeVisible();
    const options = menu.getByRole('option');
    await expect(options.first()).toHaveText(/Reading/);
    await expect(options.nth(1)).toHaveText(/Unsorted/);

    // A fresh search shows the plain list again.
    await menu.getByRole('combobox').fill('read');
    await expect(menu.getByText('Recent', { exact: true })).toHaveCount(0);
  });

  test('closes with the toggle, the cross and Esc in the right half', async ({ page }) => {
    test.skip(isCompact(page), 'side by side starts at 80em');
    await openWithReading(page);
    const rightRegion = page.getByRole('region', { name: /^Right:/ });
    // Inside side by side the left toolbar is slim: no "Side by side" button, Save view or view
    // switch, but Filter and Select stay (selection moves links with the bulk bar).
    await expect(sideBySideItem(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save view', exact: true })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Cards', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Filter', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select links', exact: true })).toBeVisible();
    // The one Close of side by side is the × of the right half (no second one on the top line).
    await expect(page.getByRole('button', { name: 'Close side by side' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Close side by side' }).click();
    await expect(rightRegion).toHaveCount(0);
    await expect(page).not.toHaveURL(/split=/);
    await expect(sideBySideItem(page)).toHaveAttribute('aria-pressed', 'false');
    // The "Side by side" button takes the focus the close control had.
    await expect(sideBySideItem(page)).toBeFocused();

    // Esc counts only with the focus in the right half.
    await toggleSideBySide(page);
    await page
      .getByRole('region', { name: 'Right: choose a folder' })
      .getByRole('option', { name: READING, exact: true })
      .last()
      .click();
    await expect(rightRegion).toBeVisible();
    await page.getByRole('button', { name: /^Left feed:/ }).focus();
    await page.keyboard.press('Escape');
    await expect(rightRegion).toBeVisible();
    await page.getByRole('button', { name: /^Right folder:/ }).focus();
    await page.keyboard.press('Escape');
    await expect(rightRegion).toHaveCount(0);
    await expect(page).not.toHaveURL(/split=/);
  });

  test('a drag over the right half has one drop target, not the sidebar folder too', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'side by side starts at 80em');
    const rightHalf = await openWithReading(page);
    const sidebarRow = page.locator('[data-ui-tree-id]').filter({ hasText: READING });

    await dragOver(page, page.locator('li.library__item').first(), rightHalf);
    await expect(rightHalf).toContainText('Move here');
    await expect(page.locator('.ui-tree__row--drop')).toHaveCount(0);

    // The same folder through its sidebar row: that row is the target and the half stays quiet.
    const row = await sidebarRow.boundingBox();
    if (!row) {
      throw new Error('the sidebar row is not visible');
    }
    await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2, { steps: 5 });
    await expect(page.locator('.ui-tree__row--drop')).toHaveCount(1);
    await expect(rightHalf).not.toContainText('Move here');
    await page.keyboard.press('Escape');
    await page.mouse.up();
  });

  test('moves a right card to the left folder with its button, without dragging', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'side by side starts at 80em');
    await seedSession(page);
    await page.goto('/unsorted');
    await expect(page.locator('ui-card').first()).toBeVisible();
    await toggleSideBySide(page);
    await page
      .getByRole('region', { name: 'Right: choose a folder' })
      .getByRole('option', { name: READING, exact: true })
      .click();
    const rightHalf = page.getByRole('region', { name: `Right: ${READING}` });
    await expect(rightHalf.locator('ui-card').first()).toBeVisible();

    const move = rightHalf.getByRole('button', { name: /^Move “.*” to Unsorted$/ }).first();
    await move.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('status').filter({ hasText: 'Moved to Unsorted' })).toBeVisible();
  });
});

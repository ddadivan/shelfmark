import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isPhone } from './support/sidebar';

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
    test.skip(isPhone(page), 'phones have no sidebar; "Move to folder" is the way there');
    const card = page.locator('li.library__item').filter({ hasText: PASTA });
    const reading = treeRow(page, READING);

    await dragOver(page, card, reading);
    await expect(reading).toHaveClass(/ui-tree__row--drop/);
    await expect(reading).toContainText('Move here');
    await expect(page.locator('.library__drag-slot')).toContainText(`${PASTA} was here`);
    await page.mouse.up();

    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toHaveCount(0);
    const toast = page.getByRole('status').filter({ hasText: `Moved to ${READING}` });
    await expect(toast).toContainText(PASTA);
    await expect(reading).not.toHaveClass(/ui-tree__row--drop/);

    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('heading', { name: PASTA, exact: true })).toBeVisible();
  });

  test('dragging a picked card carries every picked card, with one toast and Undo', async ({
    page,
  }) => {
    test.skip(isPhone(page), 'phones have no sidebar; "Move to folder" is the way there');
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

    await dragOver(page, items.nth(1), reading);
    await expect(reading).toHaveClass(/ui-tree__row--drop/);
    await expect(page.locator('.cdk-drag-preview')).toContainText('3 links');
    await page.mouse.up();

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
    test.skip(isPhone(page), 'phones have no sidebar');
    await page.goto('/links');
    const items = page.locator('li.library__item');
    await expect(items.first()).toBeVisible();
    const first = items.nth(0).locator('ui-card');
    await first.hover();
    await first.locator('.ui-checkbox__box').click();
    await settled(page);

    await dragOver(page, items.nth(1), treeRow(page, READING));
    await expect(page.locator('.cdk-drag-preview')).not.toContainText('links');
    await page.mouse.up();

    await expect(page.getByRole('status').filter({ hasText: `Moved to ${READING}` })).toBeVisible();
  });

  test('Esc cancels the drag and nothing moves', async ({ page }) => {
    test.skip(isPhone(page), 'phones have no sidebar');
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
    test.skip(isPhone(page), 'phones have no sidebar');
    await page.getByRole('radio', { name: 'List' }).click();
    const row = page.locator('li.library__item').filter({ hasText: PASTA });
    await expect(row.locator('ui-list-item')).toBeVisible();
    await settled(page);

    await dragOver(page, row, treeRow(page, READING));
    await expect(page.locator('.cdk-drag-preview')).toBeVisible();
    await page.mouse.up();

    await expect(page.getByRole('status').filter({ hasText: `Moved to ${READING}` })).toBeVisible();
  });

  test('a link cannot be dragged on a phone', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    const card = page.locator('li.library__item').filter({ hasText: PASTA });

    await expect(card).toHaveClass(/cdk-drag-disabled/);
  });

  test('dropping on the folder the link is in does nothing', async ({ page }) => {
    test.skip(isPhone(page), 'phones have no sidebar');
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

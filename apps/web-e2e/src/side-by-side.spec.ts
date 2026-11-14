import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';

// Mirror MOCK_LINKS ("Simple pasta" is unsorted) and the MOCK_FOLDERS names (libs/shared/contracts);
// the e2e project cannot import from them.
const PASTA = 'Simple pasta';
const READING = 'Reading';

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

    await page.getByRole('button', { name: 'Side by side' }).click();
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
    await expect(page.getByRole('button', { name: 'Side by side' })).toBeVisible();
  });
});

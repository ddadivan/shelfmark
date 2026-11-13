import { expect, test } from './support/test';
import { openCardEdit } from './support/a11y-flows';
import { seedSession } from './support/mock-session';
import { E2E_TAG } from './models/e2e-tag.const';

// Mirrors the mock duplicate fixture (`MOCK_LINK_PREVIEW_DUPLICATE`); e2e cannot import apps/web.
const DUPLICATE_URL = 'https://angular.dev/overview';

test.describe('edit link (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
  });

  test('edits the title and the card shows it', { tag: E2E_TAG.Phone }, async ({ page }) => {
    const dialog = await openCardEdit(page);
    await expect(dialog.getByText(/^Saved .*, (last opened .*|never opened)$/)).toBeVisible();

    await dialog.getByLabel('Title', { exact: true }).fill('A renamed link');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Changes saved')).toBeVisible();
    await expect(page.locator('ui-card').first()).toContainText('A renamed link');
  });

  test('"Open saved" from the add-link duplicate notice opens the edit dialog', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Add link' }).first().click();
    const add = page.getByRole('dialog', { name: 'Add link' });
    await add.getByLabel('Link', { exact: true }).fill(DUPLICATE_URL);
    await add.getByRole('button', { name: 'Open saved' }).click();

    const edit = page.getByRole('dialog', { name: 'Edit link' });
    await expect(edit).toBeVisible();
    await expect(edit.getByLabel('Link', { exact: true })).toHaveValue(DUPLICATE_URL);
  });

  test('fits the viewport without horizontal scroll', async ({ page }) => {
    await openCardEdit(page);

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

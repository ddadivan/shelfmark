import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';

const DIALOG_SELECTOR = '.cdk-dialog-container';
// Mirrors the mock duplicate fixture (`MOCK_LINK_PREVIEW_DUPLICATE`); e2e cannot import apps/web.
const DUPLICATE_URL = 'https://angular.dev/overview';

test.describe('edit link (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
  });

  async function openEdit(page: Page) {
    const card = page.locator('ui-card').first();
    await card.getByRole('button', { name: /^Actions for / }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit link' });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test('edits the title and the card shows it', async ({ page }) => {
    const dialog = await openEdit(page);
    await expect(dialog.getByText(/^Saved .*, (last opened .*|never opened)$/)).toBeVisible();

    await dialog.getByLabel('Title', { exact: true }).fill('A renamed link');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Changes saved')).toBeVisible();
    await expect(page.locator('ui-card').first()).toContainText('A renamed link');
  });

  test('Cancel keeps the link as it was', async ({ page }) => {
    const card = page.locator('ui-card').first();
    const before = await card.getByRole('heading').innerText();
    const dialog = await openEdit(page);

    await dialog.getByLabel('Title', { exact: true }).fill('Never saved');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(card.getByRole('heading')).toHaveText(before);
  });

  test('Delete asks first and Undo brings the link back', async ({ page }) => {
    const title = await page.locator('ui-card').first().getByRole('heading').innerText();
    const dialog = await openEdit(page);

    await dialog.getByRole('button', { name: 'Delete' }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
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
    await openEdit(page);

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test(`has no axe violations (${colorScheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await page.reload();
      await expect(page.locator('ui-card').first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
      await openEdit(page);

      await expectNoBlockingViolations(page, testInfo, { include: DIALOG_SELECTOR });
    });
  }
});

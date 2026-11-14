import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { isStaticBuild } from './support/build-mode';
import { E2E_TAG } from './models/e2e-tag.const';

const testPage = '/__e2e/add-link';
const duplicateUrl = 'https://angular.dev/overview';
// Mirror `E2E_ADD_LINK_OUTCOME` (apps/web harness page); the e2e project cannot import from apps/web.
const outcome = {
  savedPrefix: 'Outcome: saved: ',
} as const;

test.describe('add link dialog (mock API)', () => {
  test.skip(
    !isStaticBuild(),
    'The harness page only exists in the e2e build (CI=1); the dev server does not route it',
  );

  async function open(page: Page) {
    await page.goto(testPage);
    await page.getByRole('button', { name: 'Open add link' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test(
    'pasting a URL fills the title, then saves the link',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      const dialog = await open(page);

      await dialog.getByLabel('Link', { exact: true }).fill('https://example.org/post');
      await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on example.org');
      await expect(dialog.getByText('Filled in from the page')).toBeVisible();

      await dialog.getByLabel('Note').fill('Read on the weekend');
      await dialog.getByRole('button', { name: 'Save link' }).click();

      await expect(dialog).toBeHidden();
      await expect(page.locator('#outcome')).toHaveText(
        `${outcome.savedPrefix}Page on example.org | https://example.org/post`,
      );
    },
  );

  test('fits a 360px phone without horizontal scroll and keeps the actions reachable', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const dialog = await open(page);
    await dialog.getByLabel('Link', { exact: true }).fill(duplicateUrl);
    await expect(dialog.getByRole('button', { name: 'Save anyway' })).toBeInViewport();

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

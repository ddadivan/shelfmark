import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { isStaticBuild } from './support/build-mode';
import { openFeed } from './support/a11y-flows';
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

test.describe('a link typed without https:// (#405, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test(
    'example.com fills the preview and saves as https://example.com',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openFeed(page);
      await page.getByRole('button', { name: 'Add link' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      const field = dialog.getByLabel('Link', { exact: true });

      await field.fill('example.com');
      await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on example.com');
      await expect(dialog.getByText('Filled in from the page')).toBeVisible();
      await field.blur();
      await expect(field).toHaveValue('https://example.com');

      await dialog.getByRole('button', { name: 'Save link' }).click();
      await expect(dialog).toBeHidden();
      const card = page.locator('ui-card').first();
      await expect(card).toContainText('Page on example.com');
      await expect(card).toContainText('example.com');
    },
  );

  test(
    'bare domains pasted into the address field open the list and save',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openFeed(page);
      await page.getByRole('button', { name: 'Add link' }).first().click();
      const field = page
        .getByRole('dialog', { name: 'Add link' })
        .getByLabel('Link', { exact: true });
      await field.focus();
      await page.evaluate(
        `(() => {
          const data = new DataTransfer();
          data.setData('text/plain', ${JSON.stringify('example.com\nwww.example.org/a')});
          document.activeElement.dispatchEvent(
            new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
          );
        })()`,
      );

      const list = page.getByRole('dialog', { name: 'Add 2 links' });
      await expect(list).toBeVisible();
      await expect(list.getByRole('checkbox', { name: 'Page on example.com' })).toBeChecked();
      await list.getByRole('button', { name: 'Save 2 links' }).click();
      await expect(list).toBeHidden();
      const cards = page.locator('ui-card');
      await expect(cards.nth(0)).toContainText('example.com');
      await expect(cards.nth(1)).toContainText('example.org');
    },
  );
});

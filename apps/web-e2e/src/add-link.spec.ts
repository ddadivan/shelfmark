import { expect, test, type Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { isStaticBuild } from './support/build-mode';

const testPage = '/__e2e/add-link';
const dialogSelector = '.cdk-dialog-container';
const duplicateUrl = 'https://angular.dev/overview';
// Mirror `E2E_ADD_LINK_OUTCOME` (apps/web harness page); the e2e project cannot import from apps/web.
const outcome = {
  savedPrefix: 'Outcome: saved: ',
  openExistingPrefix: 'Outcome: open-existing: ',
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

  test('pasting a URL fills the title, then saves the link', async ({ page }) => {
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
  });

  test('an invalid address shows the error and is not saved', async ({ page }) => {
    const dialog = await open(page);

    await dialog.getByLabel('Link', { exact: true }).fill('youtube com/ng22');
    await dialog.getByRole('button', { name: 'Save link' }).click();

    await expect(
      dialog.getByText('Enter an address that starts with http:// or https://'),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Link', { exact: true })).toBeFocused();
  });

  test('a saved URL shows the duplicate notice; "Open saved" opens the existing link', async ({
    page,
  }) => {
    const dialog = await open(page);

    await dialog.getByLabel('Link', { exact: true }).fill(duplicateUrl);
    await expect(
      dialog.locator('ui-notice', { hasText: 'You already saved this link in Angular' }),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Open saved' }).click();
    await expect(page.locator('#outcome')).toContainText(outcome.openExistingPrefix);
  });

  test('"Save anyway" saves the duplicate', async ({ page }) => {
    const dialog = await open(page);

    await dialog.getByLabel('Link', { exact: true }).fill(duplicateUrl);
    await dialog.getByRole('button', { name: 'Save anyway' }).click();

    await expect(page.locator('#outcome')).toContainText(outcome.savedPrefix);
  });

  test('a failing preview keeps the link saveable', async ({ page }) => {
    const dialog = await open(page);

    await dialog.getByLabel('Link', { exact: true }).fill('https://unreachable.example/doc/42');
    await expect(dialog.getByText("Couldn't load a preview")).toBeVisible();
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(
      'unreachable.example/doc/42',
    );
  });

  test('Escape closes the dialog and focus returns to the trigger', async ({ page }) => {
    const dialog = await open(page);

    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open add link' })).toBeFocused();
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test(`has no axe violations with a duplicate notice (${colorScheme})`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      const dialog = await open(page);
      await dialog.getByLabel('Link', { exact: true }).fill(duplicateUrl);
      await expect(dialog.getByRole('button', { name: 'Open saved' })).toBeVisible();

      await expectNoBlockingViolations(page, testInfo, { include: dialogSelector });
    });
  }

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

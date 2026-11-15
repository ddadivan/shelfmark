import { type Locator, type Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { pickFolderMenuItem } from './support/a11y-flows';
import { seedSession } from './support/mock-session';
import { openSidebar } from './support/sidebar';
import { expect, test } from './support/test';

const READING = MOCK_FIXTURE.readingName;
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

// Settings › Appearance › "Highlight folders with their colour" (#418). The setting lives in the
// mock account (localStorage) and survives `page.goto`; folder styles live in the page, so each
// mode is chosen first and the folder coloured afterwards, inside the app.
test.describe('sidebar folder highlight (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  async function chooseHighlight(page: Page, mode: string): Promise<void> {
    await page.goto('/settings/appearance');
    const radio = page
      .getByRole('radiogroup', { name: 'Highlight folders with their color' })
      .getByRole('radio', { name: mode, exact: true });
    // A click event on the radio itself: the visually hidden input can sit under the phone tab bar.
    await radio.dispatchEvent('click');
    await expect(radio).toBeChecked();
  }

  async function colourReading(page: Page): Promise<void> {
    await page.goto('/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
    await pickFolderMenuItem(page, READING, 'Color and icon…');
    const dialog = page.getByRole('dialog', { name: READING });
    await dialog
      .locator('label.ui-choice', { has: page.getByLabel('Clay', { exact: true }) })
      .click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);
    await openSidebar(page);
  }

  const row = (page: Page): Locator =>
    page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) });

  const look = (target: Locator) =>
    target.evaluate((element) => {
      const view = element.ownerDocument.defaultView;
      return {
        background: view?.getComputedStyle(element).backgroundColor ?? '',
        stripe: view?.getComputedStyle(element, '::before').content ?? 'none',
      };
    });

  test(
    'stripe, background and off change how a coloured folder row looks',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      // Stripe is the default: a bar at the row's start, no tint.
      await colourReading(page);
      await expect(page.locator('html')).not.toHaveAttribute('data-folder-highlight', /.*/);
      await expect(row(page)).toHaveAttribute('data-ui-folder-colour', '');
      expect(await look(row(page))).toEqual({ background: TRANSPARENT, stripe: '""' });

      await chooseHighlight(page, 'Background');
      await colourReading(page);
      await expect(page.locator('html')).toHaveAttribute('data-folder-highlight', 'background');
      const tinted = await look(row(page));
      expect(tinted.background).not.toBe(TRANSPARENT);
      expect(tinted.stripe).toBe('none');

      await chooseHighlight(page, 'Off');
      await colourReading(page);
      expect(await look(row(page))).toEqual({ background: TRANSPARENT, stripe: 'none' });
    },
  );

  test('the open folder is highlighted stronger, and a pinned folder too', async ({ page }) => {
    await chooseHighlight(page, 'Background');
    await colourReading(page);
    const before = (await look(row(page))).background;
    await pickFolderMenuItem(page, READING, 'Pin to sidebar');
    const pinned = page.locator('app-sidebar-pinned .pinned__item[data-ui-folder-colour]');
    await expect(pinned).toHaveCount(1);
    expect((await look(pinned)).background).not.toBe(TRANSPARENT);

    await row(page).click();
    await expect(page).toHaveURL(`/folders/${MOCK_FIXTURE.readingId}`);
    await expect(row(page)).toHaveAttribute('aria-current', /.+/);
    const open = await look(row(page));
    expect(open.background).not.toBe(before);
    expect(open.stripe).toBe('""');
  });
});

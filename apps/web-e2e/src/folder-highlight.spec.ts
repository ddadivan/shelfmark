import { type Locator, type Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { pickFolderMenuItem } from './support/a11y-flows';
import { seedSession } from './support/mock-session';
import { isCompact, openSidebar } from './support/sidebar';
import { expect, test } from './support/test';

const READING = MOCK_FIXTURE.readingName;
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

// "Highlight with background" in a folder's style dialog (#440): a soft tint of the folder colour on
// its sidebar row (also when not open) and the tinted header block on its page. The folder styles
// live in the page (mock API), so each test styles the folder from the sidebar menu.
test.describe('per-folder highlight (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  /** Colours Reading clay and sets the highlight switch. */
  async function styleReading(page: Page, highlighted: boolean): Promise<void> {
    await page.goto('/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
    await pickFolderMenuItem(page, READING, 'Folder settings…');
    const dialog = page.getByRole('dialog', { name: READING });
    await dialog
      .locator('label.ui-choice', { has: page.getByLabel('Clay', { exact: true }) })
      .click();
    const toggle = dialog.getByRole('switch', { name: 'Highlight with background' });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    if (highlighted) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
    }
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);
    await openSidebar(page);
  }

  const row = (page: Page): Locator =>
    page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) });

  const look = (target: Locator) =>
    target.evaluate((element) => {
      const style = element.ownerDocument.defaultView?.getComputedStyle(element);
      return { background: style?.backgroundColor ?? '', weight: style?.fontWeight ?? '' };
    });

  test(
    'a highlighted folder row has a background even when it is not open',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await styleReading(page, true);
      await expect(row(page)).toHaveAttribute('data-ui-folder-highlight', '');
      expect((await look(row(page))).background).not.toBe(TRANSPARENT);
    },
  );

  test('a coloured folder that is not highlighted stays plain', async ({ page }) => {
    await styleReading(page, false);
    await expect(row(page)).toHaveAttribute('data-ui-folder-colour', '');
    await expect(row(page)).not.toHaveAttribute('data-ui-folder-highlight', /.*/);
    expect((await look(row(page))).background).toBe(TRANSPARENT);
  });

  test('hover is a stronger tint of its own colour, and the open row is stronger and bolder', async ({
    page,
  }) => {
    await styleReading(page, true);
    const rest = await look(row(page));

    if (!isCompact(page)) {
      await row(page).hover();
      // The transition is short; wait for the colour to settle on something other than the rest.
      await expect.poll(async () => (await look(row(page))).background).not.toBe(rest.background);
      const hovered = (await look(row(page))).background;
      expect(hovered).not.toBe(TRANSPARENT);
      // Not the grey hover of a plain row: a plain row's hover has no colour of the folder.
      const plain = page.getByRole('treeitem', { name: /^Unsorted\b/ });
      await plain.hover();
      await expect.poll(async () => (await look(plain)).background).not.toBe(hovered);
    }

    await row(page).click();
    await expect(page).toHaveURL(`/folders/${MOCK_FIXTURE.readingId}`);
    await expect(row(page)).toHaveAttribute('aria-current', /.+/);
    await page.mouse.move(0, 0);
    const open = await look(row(page));
    expect(open.background).not.toBe(rest.background);
    expect(open.background).not.toBe(TRANSPARENT);
    expect(Number(open.weight)).toBeGreaterThan(Number(rest.weight));
  });

  test(
    'a folder page has the plain title block until the folder is highlighted',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await styleReading(page, false);
      await row(page).click();
      await expect(page).toHaveURL(`/folders/${MOCK_FIXTURE.readingId}`);
      await expect(page.getByRole('heading', { level: 1, name: READING })).toBeVisible();
      await expect(page.locator('ui-folder-banner')).toHaveCount(0);
    },
  );

  test(
    'a highlighted folder page shows the tinted header block',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await styleReading(page, true);
      await row(page).click();
      await expect(page).toHaveURL(`/folders/${MOCK_FIXTURE.readingId}`);
      const banner = page.locator('ui-folder-banner');
      await expect(banner).toHaveCount(1);
      await expect(banner.getByRole('heading', { level: 1, name: READING })).toBeVisible();
    },
  );
});

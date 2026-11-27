import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import {
  chooseSort,
  expectSort,
  exportButton,
  selectButton,
  sortButton,
  switchView,
} from './support/library-toolbar';
import { seedSession } from './support/mock-session';
import { isCompact, isPhone } from './support/sidebar';

// The View menu's Grid size, the Headlines view, the split folder / More menus and the floating
// bulk bar (author feedback on the library, Nov 25 2026). Mock API only.

test.describe('library view controls (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  async function openFeed(page: Page, path = '/links'): Promise<void> {
    await page.goto(path);
    await expect(page.locator('ui-card').first()).toBeVisible({ timeout: 20_000 });
  }

  /** Sets the Grid size slider (1 to 6) in the View popover and closes it. */
  async function setGridSize(page: Page, step: number): Promise<void> {
    await page.getByRole('button', { name: 'View', exact: true }).click();
    const slider = page.getByRole('slider', { name: 'Grid size' });
    await slider.focus();
    await slider.fill(String(step));
    await expect(slider).toHaveValue(String(step));
    await page.keyboard.press('Escape');
  }

  async function columns(page: Page): Promise<number> {
    return page.evaluate<number>(`(() => {
      const list = document.querySelector('ul.library__grid');
      if (!list) return 0;
      return new Set(
        Array.from(list.children).map((li) => Math.round(li.getBoundingClientRect().left)),
      ).size;
    })()`);
  }

  for (const view of ['Masonry', 'Cards'] as const) {
    test(
      `Grid size changes the ${view} columns and is remembered`,
      { tag: E2E_TAG.Mobile },
      async ({ page }) => {
        test.skip(isPhone(page), 'the phone has two fixed columns and no Grid size');
        await openFeed(page);
        await switchView(page, view);

        await setGridSize(page, 1);
        const smallest = await columns(page);
        await setGridSize(page, 6);
        const largest = await columns(page);
        expect(smallest).toBeGreaterThan(largest);

        // Every step on the way is a whole number of columns, never more than a smaller step had.
        let before = smallest;
        for (const step of [2, 3, 4, 5, 6]) {
          await setGridSize(page, step);
          const now = await columns(page);
          expect(now).toBeLessThanOrEqual(before);
          before = now;
        }

        await setGridSize(page, 2);
        const second = await columns(page);
        await page.reload();
        await expect(page.locator('ui-card').first()).toBeVisible({ timeout: 20_000 });
        expect(await columns(page)).toBe(second);
        await page.getByRole('button', { name: 'View', exact: true }).click();
        await expect(page.getByRole('slider', { name: 'Grid size' })).toHaveValue('2');
      },
    );
  }

  test(
    'Headlines is the fourth view: one 40px line per link, kept over a reload',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openFeed(page);
      if (isCompact(page)) {
        // The mobile shell has the view switch inside the View menu.
        await page.getByRole('button', { name: 'View', exact: true }).click();
      }
      await expect(
        page.getByRole('radiogroup', { name: 'View', exact: true }).getByRole('radio'),
      ).toHaveCount(4);
      if (isCompact(page)) {
        await page.keyboard.press('Escape');
      }

      await switchView(page, 'Headlines');
      await expect(page.locator('ui-card')).toHaveCount(0);
      const row = page.locator('.library__rows--headlines ui-list-item').first();
      await expect(row).toBeVisible();
      await expect(row).toHaveClass(/ui-list-item--headline/u);
      const height = (await row.boundingBox())?.height ?? 0;
      expect(height).toBeGreaterThanOrEqual(40);
      expect(height).toBeLessThanOrEqual(48);

      // The Grid size does not apply to rows.
      if (!isPhone(page)) {
        await page.getByRole('button', { name: 'View', exact: true }).click();
        await expect(page.getByRole('slider', { name: 'Grid size' })).toBeDisabled();
        await page.keyboard.press('Escape');
      }

      await page.reload();
      await expect(page.locator('.library__rows--headlines ui-list-item').first()).toBeVisible({
        timeout: 20_000,
      });
      if (isCompact(page)) {
        await page.getByRole('button', { name: 'View', exact: true }).click();
      }
      await expect(page.getByRole('radio', { name: 'Headlines' })).toBeChecked();
    },
  );

  test('the Headlines panel keeps its full height, so its last row scrolls into view', async ({
    page,
  }) => {
    // The panel clips its rounded corners; that once let the feed's flex column shrink it to the
    // scroll area, which cut the rows below and left nothing to scroll (also beside the preview).
    test.skip(isCompact(page), 'the mobile shell scrolls the page, not the feed');
    await openFeed(page);
    await switchView(page, 'Headlines');
    const panel = page.locator('.library__rows--headlines').first();
    await expect(panel.locator('ui-list-item').first()).toBeVisible();

    const clipped = await panel.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(clipped).toBeLessThanOrEqual(1);

    const last = page.locator('.library__rows--headlines ui-list-item').last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
  });

  test('the View menu has a Description switch that is on by default and remembered', async ({
    page,
  }) => {
    await openFeed(page);
    const open = async () => {
      await page.getByRole('button', { name: 'View', exact: true }).click();
      return page.getByRole('switch', { name: 'Description' });
    };
    await expect(await open()).toBeChecked();
    await page.getByRole('switch', { name: 'Description' }).click();
    await expect(page.getByRole('switch', { name: 'Description' })).not.toBeChecked();
    await page.keyboard.press('Escape');

    await page.reload();
    await expect(page.locator('ui-card').first()).toBeVisible({ timeout: 20_000 });
    await expect(await open()).not.toBeChecked();
    await page.keyboard.press('Escape');
  });

  test(
    'card: the ⋯ joins the star on hover, and the card menu opens with a right click',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openFeed(page);
      const card = page.locator('ui-card').first();
      const star = card.getByRole('button', { name: /^Favorite: / });
      await expect(star).toBeVisible();
      const touch = await page.evaluate<boolean>("matchMedia('(hover: none)').matches");
      if (!touch) {
        await page.mouse.move(2, 2);
        await expect(card.locator('.ui-card__more')).toHaveCSS('opacity', '0');
        await card.hover();
        await expect(card.locator('.ui-card__more')).toHaveCSS('opacity', '1');
        // The select circle shows on hover, the star stays where it was.
        await expect(card.getByRole('checkbox')).toBeVisible();
        // A right click opens the card menu at the pointer.
        await card.click({ button: 'right', position: { x: 60, y: 60 } });
        await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
        await page.keyboard.press('Escape');
      } else {
        await expect(card.locator('.ui-card__more')).toHaveCSS('opacity', '1');
      }
    },
  );

  test('the folder page has its own menu; sort and export are toolbar buttons', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'the desktop folder header; the phone path is the bottom sheet');
    await openFeed(page, `/folders/${MOCK_FIXTURE.readingId}`);

    await page
      .getByRole('main')
      .getByRole('button', { name: `Actions for ${MOCK_FIXTURE.readingName}` })
      .click();
    const folderMenu = page.getByRole('menu', { name: `Actions for ${MOCK_FIXTURE.readingName}` });
    for (const name of [
      'New subfolder',
      'Add link here',
      'Rename',
      'Folder settings…',
      'Move to…',
      'Pin to sidebar',
      'Share…',
      'Delete folder…',
    ]) {
      await expect(folderMenu.getByRole('menuitem', { name })).toBeVisible();
    }
    await expect(folderMenu.getByRole('menuitemradio')).toHaveCount(0);
    await expect(folderMenu.getByRole('menuitem', { name: /Export|Filter|Select/u })).toHaveCount(
      0,
    );
    await page.keyboard.press('Escape');
    await expect(folderMenu).toBeHidden();

    // Sort and Export are toolbar buttons; Sort lists the eight orders (under Date and Name) and nothing else.
    await sortButton(page).click();
    const sort = page.getByRole('menu', { name: 'Sort by' });
    await expect(sort.getByRole('menuitemradio')).toHaveCount(8);
    await expect(sort.getByRole('menuitem')).toHaveCount(0);
    await expect(
      sort.getByRole('menuitemradio', { name: /Select|Filter|Side by side|Save|Export/u }),
    ).toHaveCount(0);
    await expect(exportButton(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'More view options' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(selectButton(page)).toBeVisible();
    await expect(sort.getByRole('menuitem', { name: /Rename|Delete folder|Move to/u })).toHaveCount(
      0,
    );
  });

  test('F2 renames the folder of a folder page', async ({ page }) => {
    test.skip(isCompact(page), 'a keyboard shortcut');
    await openFeed(page, `/folders/${MOCK_FIXTURE.readingId}`);
    await page.locator('.library__scroll').focus();
    await page.keyboard.press('F2');
    await expect(page.getByRole('dialog', { name: 'Rename folder' })).toBeVisible();
  });

  test('the bulk bar floats above the bottom edge, sized to its content', async ({ page }) => {
    test.skip(isCompact(page), 'desktop: the bar floats in the feed column');
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFeed(page);
    await selectButton(page).click();
    const bar = page.locator('.library__bulk');
    await expect(bar).toBeVisible();

    const box = await bar.boundingBox();
    const area = await page.locator('.library__scroll').boundingBox();
    expect(box).not.toBeNull();
    expect(area).not.toBeNull();
    const barBox = box ?? { x: 0, y: 0, width: 0, height: 0 };
    const areaBox = area ?? { x: 0, y: 0, width: 0, height: 0 };
    // Content-sized, not the whole feed width.
    expect(barBox.width).toBeLessThan(areaBox.width - 120);
    // A gap of at least 16px to the bottom of the scroll area.
    expect(areaBox.y + areaBox.height - (barBox.y + barBox.height)).toBeGreaterThanOrEqual(16);
    // Centred in the feed column.
    const centre = (box: { x: number; width: number }) => box.x + box.width / 2;
    expect(Math.abs(centre(barBox) - centre(areaBox))).toBeLessThanOrEqual(12);
  });

  test('the sort menu offers the newer orders and keeps the choice in ?sort=', async ({ page }) => {
    await openFeed(page);
    for (const [name, value] of [
      ['Recently opened', 'opened'],
      ['Recently edited', 'edited'],
      ['Site A–Z', 'site'],
      ['Favorites first', 'favorites'],
    ] as const) {
      await chooseSort(page, name);
      await expect(page).toHaveURL(new RegExp(`sort=${value}`, 'u'));
      await expectSort(page, name);
    }
  });
});

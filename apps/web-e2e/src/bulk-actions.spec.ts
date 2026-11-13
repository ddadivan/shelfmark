import { type Locator, type Page } from '@playwright/test';
import { openFeed } from './support/a11y-flows';
import { makePageTall, scrollMainTo, SHELL_MAIN } from './support/scroll';
import { settled } from './support/settled';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';

// Mirror MOCK_NAME.FolderReading (libs/shared/contracts); the e2e project cannot import from it.
const READING = 'Reading';
// The mock library has 60 links (a first page of 50).
const ALL_LINKS = 60;

const cards = (page: Page): Locator => page.locator('ui-card');
const header = (page: Page): Locator => page.getByRole('group', { name: 'Selection' });
const bar = (page: Page): Locator =>
  page.getByRole('toolbar', { name: /^Actions for \d+ selected/ });
const barButton = (page: Page, name: string): Locator =>
  bar(page).getByRole('button', { name, exact: true });
const selectedText = (page: Page): Locator => page.locator('.library__selected');

/** The toast sits exactly 12px above the visible bulk bar (#350, #352), within 1px. */
async function expectToastGap(page: Page, toast: Locator): Promise<void> {
  await expect
    .poll(async () => {
      const toastBox = await toast.boundingBox();
      const barBox = await bar(page).boundingBox();
      return Math.abs((barBox?.y ?? 0) - ((toastBox?.y ?? 0) + (toastBox?.height ?? 0)) - 12);
    })
    .toBeLessThanOrEqual(1);
}

/** Scrolls `selector` to `top` (`'end'` for its bottom). String script: no DOM lib here. */
async function scrollAreaTo(page: Page, selector: string, top: number | 'end'): Promise<void> {
  const to = top === 'end' ? 'el.scrollHeight' : String(top);
  await page.evaluate(
    `(() => { const el = document.querySelector('${selector}'); el.scrollTo(0, ${to}); })()`,
  );
}

async function cardTitle(card: Locator): Promise<string> {
  return ((await card.locator('.ui-card__link').textContent()) ?? '').trim();
}

/** Desktop: the checkbox shows on hover; clicking its box toggles the card. */
async function pick(page: Page, index: number, modifiers: ('Shift' | 'Meta')[] = []) {
  const card = cards(page).nth(index);
  await card.hover();
  await card.locator('ui-checkbox .ui-checkbox__box').click({ modifiers });
}

/** Phone: touch down on the card and hold until the long press starts the selection. */
async function longPress(page: Page, target: Locator) {
  const touch = { pointerType: 'touch', isPrimary: true, pointerId: 9 };
  await target.dispatchEvent('pointerdown', touch);
  await expect(header(page)).toBeVisible();
  await target.dispatchEvent('pointerup', touch);
  // The bulk bar rises in; a tap during its entrance can miss the moving button.
  await settled(page);
}

test.describe('select links and bulk actions (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.describe('desktop', () => {
    test.skip(({ isMobile }) => isMobile, 'the phone has its own tests');

    test('a click opens until a link is picked, then it toggles; the mode is announced', async ({
      page,
    }) => {
      await openFeed(page);
      const first = cards(page).first();
      // Not selecting: the link is a real link and the "Open" bar is there.
      await expect(first.locator('a.ui-card__link')).toHaveAttribute('href', /^https?:/);
      await expect(first.locator('.ui-card__overlay')).toHaveCount(1);
      await expect(first.locator('.link-card__open')).toHaveCount(1);

      await pick(page, 0);
      await expect(page.locator('.library__live')).toHaveText(/Selection mode on/);
      // Selection mode: no "Open" bar, a click on the card toggles the card.
      await expect(first.locator('.link-card__open')).toHaveCount(0);
      await cards(page).nth(1).locator('.ui-card__link').click();
      await expect(selectedText(page)).toHaveText('2 selected');
      await cards(page)
        .nth(1)
        .locator('.ui-card__link')
        .click({ modifiers: ['Meta'] });
      await expect(selectedText(page)).toHaveText('1 selected');

      await page.keyboard.press('Escape');
      await expect(header(page)).toHaveCount(0);
      await expect(page.locator('.library__live')).toHaveText('Selection mode off.');
      await expect(first.locator('.link-card__open')).toHaveCount(1);
    });

    test('the bulk bar sits at the bottom of the window in a short feed too (#350)', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1100 });
      await openFeed(page);
      // The "recipes" tag and the Videos view together leave two links.
      await page.getByRole('navigation').getByText('recipes', { exact: true }).first().click();
      await page.getByRole('button', { name: /^Videos \d+$/ }).click();
      await expect(cards(page)).toHaveCount(2);
      await pick(page, 0);
      await expect(bar(page)).toBeVisible();
      await settled(page);

      const box = await bar(page).boundingBox();
      // The same inset under the bar as with a long feed (--space-4 = 16px, plus the scroll
      // area's own 4px padding), whatever the number of cards.
      expect(1100 - ((box?.y ?? 0) + (box?.height ?? 0))).toBeGreaterThanOrEqual(12);
      expect(1100 - ((box?.y ?? 0) + (box?.height ?? 0))).toBeLessThanOrEqual(60);
      const lastCard = await cards(page).last().boundingBox();
      // Not floating under the cards: the bar is far below the last card.
      expect((box?.y ?? 0) - ((lastCard?.y ?? 0) + (lastCard?.height ?? 0))).toBeGreaterThan(200);
    });

    test('hover checkbox, Shift range, click toggles, select all and Esc', async ({ page }) => {
      await openFeed(page);
      await expect(header(page)).toHaveCount(0);
      await expect(cards(page).first().locator('.ui-card__select')).toHaveCSS('opacity', '0');

      await pick(page, 0);
      await expect(header(page)).toBeVisible();
      await expect(selectedText(page)).toHaveText('1 selected');
      await expect(bar(page)).toBeVisible();
      // Two separate hints, never chained with a middle dot.
      await expect(header(page).locator('.library__hint')).toHaveText([
        'Shift + click selects a range',
        'Esc clears',
      ]);

      await pick(page, 3, ['Shift']);
      await expect(selectedText(page)).toHaveText('4 selected');
      await expect(page.locator('ui-card.ui-card--checked')).toHaveCount(4);

      // While selecting, a click on a card toggles it and opens nothing.
      let opened = false;
      page.context().on('page', () => (opened = true));
      await cards(page).nth(5).locator('.ui-card__link').click();
      await expect(selectedText(page)).toHaveText('5 selected');
      expect(opened).toBe(false);

      const total = await cards(page).count();
      await header(page)
        .getByRole('button', { name: `Select all ${total}` })
        .click();
      await expect(selectedText(page)).toHaveText(`${total} selected`);

      await page.keyboard.press('Escape');
      await expect(header(page)).toHaveCount(0);
      await expect(bar(page)).toHaveCount(0);
    });

    test('moves the selection to a folder with one choice in the picker, and Undo puts it back', async ({
      page,
    }) => {
      await openFeed(page, '/unsorted');
      const before = await cards(page).count();
      const titles = [0, 1, 2].map((index) => cardTitle(cards(page).nth(index)));
      const names = await Promise.all(titles);
      for (const index of [0, 1, 2]) {
        await pick(page, index);
      }
      await barButton(page, 'Move').click();
      const picker = page.getByRole('dialog', { name: 'Move 3 links' });
      await expect(picker.getByRole('button', { name: 'Move', exact: true })).toHaveCount(0);
      await picker.getByRole('option', { name: READING, exact: true }).click();

      await expect(picker).toHaveCount(0);
      await expect(page.getByText(`3 links moved to ${READING}`)).toBeVisible();
      await expect(cards(page)).toHaveCount(before - 3);
      await expect(header(page)).toHaveCount(0);
      for (const title of names) {
        await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
      }
      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(cards(page)).toHaveCount(before);
    });

    test('adds a tag to every selected link and removes it again', async ({ page }) => {
      await openFeed(page);
      await pick(page, 0);
      await pick(page, 1);
      await barButton(page, 'Tags').click();
      let dialog = page.getByRole('dialog', { name: 'Tags for 2 links' });
      await dialog.getByRole('combobox', { name: 'Add to all' }).fill('bulk-e2e');
      await page.keyboard.press('Enter');
      await dialog.getByRole('button', { name: 'Apply' }).click();
      await expect(page.getByText('Tags updated on 2 links')).toBeVisible();
      await expect(cards(page).nth(0).getByText('bulk-e2e')).toBeVisible();
      await expect(cards(page).nth(1).getByText('bulk-e2e')).toBeVisible();
      // Tags keep the selection.
      await expect(selectedText(page)).toHaveText('2 selected');

      await barButton(page, 'Tags').click();
      dialog = page.getByRole('dialog', { name: 'Tags for 2 links' });
      await dialog.getByRole('combobox', { name: 'Remove from all' }).fill('bulk-e2e');
      await page.getByRole('option', { name: /bulk-e2e/ }).click();
      await dialog.getByRole('button', { name: 'Apply' }).click();
      await expect(cards(page).nth(0).getByText('bulk-e2e')).toHaveCount(0);
      await expect(cards(page).nth(1).getByText('bulk-e2e')).toHaveCount(0);
    });

    test('the toast stays 12px above the bar while the feed scrolls (#352)', async ({ page }) => {
      // The mock feed is long enough to scroll the feed area on its own.
      await openFeed(page);
      await pick(page, 0);
      await barButton(page, 'Favorite').click();
      const toast = page.locator('ui-toast').filter({ hasText: /favorites/ });
      await expect(toast).toBeVisible();
      await settled(page);
      await expectToastGap(page, toast);

      await scrollAreaTo(page, '.library__scroll', 700);
      await expectToastGap(page, toast);
      await scrollAreaTo(page, '.library__scroll', 'end');
      await expectToastGap(page, toast);
      await scrollAreaTo(page, '.library__scroll', 0);
      await expectToastGap(page, toast);
    });

    test('a toast is centred on the content area, like the bulk bar (#352)', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await openFeed(page);
      await pick(page, 0);
      await barButton(page, 'Favorite').click();
      const toast = page.locator('ui-toast').first();
      await expect(toast).toBeVisible();
      await settled(page);
      const toastBox = await toast.boundingBox();
      const barBox = await page.locator('ui-bulk-bar').boundingBox();
      const centre = (box: { x: number; width: number } | null) =>
        (box?.x ?? 0) + (box?.width ?? 0) / 2;
      expect(Math.abs(centre(toastBox) - centre(barBox))).toBeLessThanOrEqual(1);
      // Not the window centre: the sidebar takes the left of the window.
      expect(Math.abs(centre(toastBox) - 720)).toBeGreaterThan(50);
      // And 12px above the visible bar (#352).
      const barTop = (await bar(page).boundingBox())?.y ?? 0;
      expect(
        Math.abs(barTop - ((toastBox?.y ?? 0) + (toastBox?.height ?? 0)) - 12),
      ).toBeLessThanOrEqual(1);
    });

    for (const size of [
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
      { width: 1024, height: 768 },
      { width: 1280, height: 600 },
    ]) {
      test(`the bar's bottom is on the sidebar card's bottom line at ${size.width}x${size.height} (#352)`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        await openFeed(page);
        await pick(page, 0);
        await expect(bar(page)).toBeVisible();
        await settled(page);
        const bottom = async (locator: Locator) => {
          const box = await locator.boundingBox();
          return (box?.y ?? 0) + (box?.height ?? 0);
        };
        const sidebarBottom = await bottom(page.locator('.shell__sidebar'));
        expect(
          Math.abs((await bottom(page.locator('ui-bulk-bar'))) - sidebarBottom),
        ).toBeLessThanOrEqual(1);

        // The last row stays reachable: at the end of the feed (every page loaded) it ends above the bar.
        const area = page.locator('.library__scroll');
        await expect
          .poll(async () => {
            await area.evaluate((el) => el.scrollTo(0, el.scrollHeight));
            return cards(page).count();
          })
          .toBe(ALL_LINKS);
        await area.evaluate((el) => el.scrollTo(0, el.scrollHeight));
        const lastCard = cards(page).last();
        await expect(lastCard).toBeVisible();
        const barTop = (await page.locator('ui-bulk-bar').boundingBox())?.y ?? 0;
        // Sub-pixel rounding: the last row may end exactly on the bar's top edge.
        expect(await bottom(lastCard)).toBeLessThanOrEqual(barTop + 1);
      });
    }

    test('Delete moves the links to Trash, Undo restores them', async ({ page }) => {
      await openFeed(page);
      const before = await cards(page).count();
      const titles = await Promise.all([0, 1, 2].map((i) => cardTitle(cards(page).nth(i))));
      await pick(page, 0);
      await pick(page, 2, ['Shift']);
      await barButton(page, 'Delete').click();
      const confirm = page.getByRole('alertdialog', { name: 'Move 3 links to Trash?' });
      await confirm.getByRole('button', { name: 'Move to Trash' }).click();

      const toast = page.locator('ui-toast').filter({ hasText: '3 links moved to Trash' });
      await expect(toast).toBeVisible();
      await expect(toast).toContainText(titles[0] ?? '');
      await expect(cards(page)).toHaveCount(before - 3);
      await expect(header(page)).toHaveCount(0);

      await toast.getByRole('button', { name: 'Undo' }).click();
      await expect(cards(page)).toHaveCount(before);
      for (const title of titles) {
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      }
    });

    test('Open all opens a tab per link and says when pop-ups were blocked', async ({
      page,
      context,
    }) => {
      await openFeed(page);
      await pick(page, 0);
      await pick(page, 1);
      const tabs: Page[] = [];
      context.on('page', (tab) => tabs.push(tab));
      // The mock links point to the internet: answer every new tab locally.
      await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) =>
        route.fulfill({ body: 'ok', contentType: 'text/plain' }),
      );
      await barButton(page, 'Open all').click();
      await expect.poll(() => tabs.length).toBe(2);
      for (const tab of tabs) {
        await tab.close();
      }

      // A pop-up blocker answers `null`: the toast says how many tabs did not open.
      await page.evaluate('window.open = () => null');
      await barButton(page, 'Open all').click();
      await expect(page.getByText('The browser blocked 2 of 2 tabs')).toBeVisible();
    });
  });

  test.describe('phone', { tag: E2E_TAG.Phone }, () => {
    test.skip(({ isMobile }) => !isMobile, 'the desktop has its own tests');

    test('a long press starts the selection, taps add to it, Cancel clears', async ({ page }) => {
      await openFeed(page);
      await longPress(page, cards(page).nth(0));
      await expect(selectedText(page)).toHaveText('1 selected');
      await expect(cards(page).nth(1).locator('ui-checkbox')).toHaveCount(1);

      await cards(page).nth(1).locator('.ui-card__link').tap();
      await expect(selectedText(page)).toHaveText('2 selected');
      await expect(bar(page)).toBeVisible();
      await expect(barButton(page, 'Open all')).toHaveCount(0);

      await header(page).getByRole('button', { name: 'Cancel selection' }).click();
      await expect(header(page)).toHaveCount(0);
    });

    test('the checkboxes are visible at rest and a tap on one starts the selection', async ({
      page,
    }) => {
      await openFeed(page);
      const box = cards(page).first().locator('ui-checkbox .ui-checkbox__box');
      await expect(cards(page).first().locator('.ui-card__select')).toHaveCSS('opacity', '1');
      await expect(box).toBeVisible();
      await box.tap();
      await expect(selectedText(page)).toHaveText('1 selected');
    });

    test('moves three selected links from the bar with one tap in the sheet, and Undo puts them back', async ({
      page,
    }) => {
      await openFeed(page, '/unsorted');
      const before = await cards(page).count();
      await longPress(page, cards(page).nth(0));
      await cards(page).nth(1).locator('.ui-card__link').tap();
      await cards(page).nth(2).locator('.ui-card__link').tap();
      await expect(selectedText(page)).toHaveText('3 selected');
      await barButton(page, 'Move').click();
      const sheet = page.getByRole('dialog', { name: 'Move 3 links' });
      await expect(sheet.locator('.ui-dialog--sheet')).toHaveCount(1);
      await settled(page);
      await sheet.getByRole('option', { name: READING, exact: true }).tap();

      await expect(sheet).toHaveCount(0);
      await expect(page.getByText(`3 links moved to ${READING}`)).toBeVisible();
      await expect(cards(page)).toHaveCount(before - 3);
      await expect(header(page)).toHaveCount(0);
      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(cards(page)).toHaveCount(before);
    });

    test('Share is hidden without the Web Share API (Copy links instead)', async ({ page }) => {
      await page.addInitScript('delete Navigator.prototype.share; delete navigator.share;');
      await openFeed(page);
      await longPress(page, cards(page).nth(0));
      await expect(barButton(page, 'Share')).toHaveCount(0);
      await expect(barButton(page, 'Copy links')).toBeVisible();
    });

    test('Share hands the URLs to the share sheet', async ({ page }) => {
      await page.addInitScript(
        'window.__shared = []; Object.defineProperty(navigator, "share", { configurable: true, value: (data) => { window.__shared.push(data); return Promise.resolve(); } });',
      );
      await openFeed(page);
      await longPress(page, cards(page).nth(0));
      await cards(page).nth(1).locator('.ui-card__link').tap();
      await barButton(page, 'Share').click();
      const shared = (await page.evaluate('window.__shared')) as { text: string }[];
      expect(shared).toHaveLength(1);
      expect(shared[0]?.text.split('\n')).toHaveLength(2);
    });

    test(
      'the bar sits above the tab bar and toasts sit above the bar',
      { tag: E2E_TAG.Mobile },
      async ({ page }) => {
        await openFeed(page);
        await longPress(page, cards(page).nth(0));
        await barButton(page, 'Favorite').click();
        // Added or removed: the toast for the bulk favorite change.
        const toast = page.locator('ui-toast').filter({ hasText: /from favorites|to favorites/ });
        await expect(toast).toBeVisible();
        await settled(page);
        const barBox = await bar(page).boundingBox();
        const tabBox = await page.locator('ui-tab-bar nav').boundingBox();
        const toastBox = await toast.boundingBox();
        expect(barBox && tabBox && barBox.y + barBox.height <= tabBox.y).toBe(true);
        // Exactly 12px above the bar (#352).
        const gap = (barBox?.y ?? 0) - ((toastBox?.y ?? 0) + (toastBox?.height ?? 0));
        expect(Math.abs(gap - 12)).toBeLessThanOrEqual(1);
      },
    );

    test('the toast stays 12px above the bar while the main column scrolls (#352)', async ({
      page,
    }) => {
      await openFeed(page);
      await makePageTall(page, 3000);
      await longPress(page, cards(page).nth(0));
      await barButton(page, 'Favorite').click();
      const toast = page.locator('ui-toast').filter({ hasText: /from favorites|to favorites/ });
      await expect(toast).toBeVisible();
      await settled(page);
      await expectToastGap(page, toast);

      await scrollMainTo(page, 700);
      await expectToastGap(page, toast);
      await scrollAreaTo(page, SHELL_MAIN, 'end');
      await expectToastGap(page, toast);
      await scrollMainTo(page, 0);
      await expectToastGap(page, toast);
    });
  });
});

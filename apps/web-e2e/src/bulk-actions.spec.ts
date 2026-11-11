import { type Locator, type Page } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { openFeed } from './support/a11y-flows';
import { expectNoBlockingViolations } from './support/axe';
import { settled } from './support/settled';
import { viewEntry } from './support/sidebar';
import { expect, test } from './support/test';

// Mirror MOCK_NAME.FolderReading (libs/shared/contracts); the e2e project cannot import from it.
const READING = 'Reading';

const cards = (page: Page): Locator => page.locator('ui-card');
const header = (page: Page): Locator => page.getByRole('group', { name: 'Selection' });
const bar = (page: Page): Locator =>
  page.getByRole('toolbar', { name: /^Actions for \d+ selected/ });
const barButton = (page: Page, name: string): Locator =>
  bar(page).getByRole('button', { name, exact: true });
const selectedText = (page: Page): Locator => page.locator('.library__selected');

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

    test('Ctrl+A selects all, Space toggles the focused card, Done clears', async ({ page }) => {
      await openFeed(page);
      const total = await cards(page).count();
      await page.locator('.library__scroll').focus();
      await page.keyboard.press('ControlOrMeta+a');
      await expect(selectedText(page)).toHaveText(`${total} selected`);

      await cards(page).first().locator('.ui-card__link').focus();
      await page.keyboard.press('Space');
      await expect(selectedText(page)).toHaveText(`${total - 1} selected`);
      await page.keyboard.press('Space');
      await expect(selectedText(page)).toHaveText(`${total} selected`);

      await header(page).getByRole('button', { name: 'Done' }).click();
      await expect(header(page)).toHaveCount(0);
    });

    test('M opens Move for the focused card', async ({ page }) => {
      await openFeed(page);
      const title = await cardTitle(cards(page).first());
      await cards(page).first().locator('.ui-card__link').focus();
      await page.keyboard.press('m');
      await expect(page.getByRole('dialog', { name: `Move “${title}”` })).toBeVisible();
    });

    test('moves the selection to a folder, and Undo puts it back', async ({ page }) => {
      await openFeed(page, '/unsorted');
      const before = await cards(page).count();
      const titles = [await cardTitle(cards(page).nth(0)), await cardTitle(cards(page).nth(1))];
      await pick(page, 0);
      await pick(page, 1);
      await barButton(page, 'Move').click();
      const dialog = page.getByRole('dialog', { name: 'Move 2 links' });
      await dialog.getByRole('combobox', { name: 'Folder' }).click();
      await page.getByRole('option').filter({ hasText: READING }).click();
      await dialog.getByRole('button', { name: 'Move' }).click();

      await expect(page.getByText(`2 links moved to ${READING}`)).toBeVisible();
      await expect(cards(page)).toHaveCount(before - 2);
      await expect(header(page)).toHaveCount(0);
      for (const title of titles) {
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

    test('Favorite turns on for all, then off for all', async ({ page }) => {
      await openFeed(page);
      await pick(page, 0);
      await pick(page, 1);
      const button = barButton(page, 'Favorite');
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await button.click();
      await expect(page.getByText('2 links added to favorites')).toBeVisible();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await button.click();
      await expect(page.getByText('2 links removed from favorites')).toBeVisible();
      await expect(button).toHaveAttribute('aria-pressed', 'false');
    });

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

    test('Copy links puts the URLs on the clipboard, one per line', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await openFeed(page);
      await pick(page, 0);
      await pick(page, 1);
      await barButton(page, 'Copy links').click();
      await expect(page.getByText('2 links copied')).toBeVisible();
      const text = await page.evaluate('navigator.clipboard.readText()');
      expect(String(text).split('\n')).toHaveLength(2);
      expect(String(text)).toMatch(/^https?:\/\//);
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

    test('Open all asks first above 10 links', async ({ page }) => {
      await openFeed(page);
      const total = await cards(page).count();
      test.skip(total <= 10, 'the mock feed needs more than 10 links');
      await page.locator('.library__scroll').focus();
      await page.keyboard.press('ControlOrMeta+a');
      await barButton(page, 'Open all').click();
      const confirm = page.getByRole('dialog', { name: `Open ${total} links?` });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirm).toHaveCount(0);
    });

    test('the list view selects rows too', async ({ page }) => {
      await openFeed(page);
      await page.getByRole('radio', { name: 'List' }).check({ force: true });
      const row = page.locator('ui-list-item').first();
      await row.hover();
      await row.locator('ui-checkbox .ui-checkbox__box').click();
      await expect(selectedText(page)).toHaveText('1 selected');
      await expect(page.locator('ui-list-item.ui-list-item--checked')).toHaveCount(1);
    });

    test('a route change clears the selection', async ({ page }) => {
      await openFeed(page);
      await pick(page, 0);
      await expect(header(page)).toBeVisible();
      await viewEntry(page, 'Favorites').click();
      await expect(page).toHaveURL(/\/favorites/);
      await expect(header(page)).toHaveCount(0);
    });
  });

  test.describe('phone', () => {
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

    test('the bar sits above the tab bar and toasts sit above the bar', async ({ page }) => {
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
      expect(barBox && toastBox && toastBox.y + toastBox.height <= barBox.y).toBe(true);
    });
  });

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      test('no serious or critical axe violations with the bulk bar', async ({
        page,
        isMobile,
      }, testInfo) => {
        await openFeed(page);
        if (isMobile) {
          await longPress(page, cards(page).nth(0));
        } else {
          await pick(page, 0);
          await pick(page, 1);
        }
        await expect(bar(page)).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await settled(page);
        await expectNoBlockingViolations(page, testInfo);
      });
    });
  }
});

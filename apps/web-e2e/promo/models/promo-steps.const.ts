import { expect, type Page } from '@playwright/test';
import { SEARCH_BUTTON } from '../../src/support/search-button';
import { openTags } from '../../src/support/sidebar';
import { Finger } from '../../src/support/touch';
import {
  backToAllLinks,
  folderMenu,
  libraryEntry,
  openAsGuest,
  openSettings,
  pressTab,
  useShareAccount,
} from '../support/promo-flows';
import { PROMO_DEVICE } from './promo-device.const';
import { PROMO_SHARE } from './promo-share.const';
import type { PromoStep } from './promo-step.interface';

/** The link the video saves; the mock preview API answers "Page on <host>" for any new link. */
const LINK_URL = 'https://web.dev/articles/vitals';
const LINK_TITLE = 'Page on web.dev';
/** A pasted list for "Add several links": three new links among some chat text. */
const PASTED_LIST = [
  'Worth a look this week:',
  'https://developer.mozilla.org/docs/Web/CSS/grid',
  'https://a11yproject.com/checklist',
  'and www.smashingmagazine.com too',
].join('\n');
/** Folders and tags of the demo library (apps/web/src/app/features/links/mock/models). */
const FOLDER_SAVE = 'Work';
const FOLDER_STYLE = 'Clothes';
const FOLDER_MOVE = 'Recipes';
const TAG_NEW = 'weekend';
const TAG_FILTER = 'angular';
/** Typed into the search: finds "Cacio e pepe, the easy way" of the demo. */
const QUERY = 'pepe';
const SEARCH_HIT = 'Cacio e pepe';
/** The own accent colour the video picks (a light teal that passes the 4.5:1 guard on the dark base). */
const OWN_ACCENT = '#5cc2b5';
/** The link the phone shares into the app from another app (the PWA share target). */
const SHARED_URL = 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/';

/** The cards of the feed in the order shown. */
const cards = (page: Page) => page.locator('ui-card');
const addDialog = (page: Page) => page.getByRole('dialog', { name: 'Add link' });
const shareDialog = (page: Page) =>
  page.getByRole('dialog', { name: `Share folder “${PROMO_SHARE.Folder}”` });

/**
 * The promo video, step by step (HowItWorks.dc.html, "Shelfmark in 2 minutes", #315: the features
 * of today). Six chapters match the dialog: Save a link 0:00, Folders and tags 0:34, Find it again
 * 0:52, Many at once 1:19, Make it yours 1:39, Share a collection 2:06 (#326). Pauses are tuned so each chapter's last
 * step ends a little before the next start; the recorder holds the rest. A step with `only` runs
 * on that device only (drag and drop needs a mouse; the share sheet is the phone's).
 */
export const PROMO_STEPS: readonly PromoStep[] = [
  {
    id: 'landing',
    chapter: 'Save',
    caption: { desktop: 'Shelfmark keeps every link you save in one place.' },
    run: async ({ director }) => {
      await director.pause(1800);
    },
  },
  {
    id: 'demo',
    caption: {
      desktop: 'Open the demo: no account needed.',
      phone: 'Open the demo: the tab bar keeps everything in reach.',
    },
    run: async ({ page, director }) => {
      await director.press(
        page.getByRole('link', { name: 'Open the demo' }).filter({ visible: true }).first(),
      );
      await expect(page).toHaveURL(/\/links$/);
      const welcome = page.getByRole('dialog');
      await expect(welcome).toBeVisible();
      await director.pause(600);
      await director.press(welcome.getByRole('button', { name: 'Skip' }));
      await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
      await director.parkPointer();
      await director.pause(900);
    },
  },
  {
    id: 'paste',
    caption: { desktop: 'Paste a link: the preview fills in by itself.' },
    run: async ({ page, director }) => {
      await director.press(
        page.getByRole('button', { name: 'Add link' }).filter({ visible: true }).first(),
      );
      const dialog = addDialog(page);
      await expect(dialog).toBeVisible();
      await director.pause(300);
      await director.type(dialog.getByLabel('Link', { exact: true }), LINK_URL);
      await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(LINK_TITLE);
      await director.pause(1200);
    },
  },
  {
    id: 'file',
    caption: { desktop: 'Pick a folder and a tag, then save.' },
    poster: true,
    run: async ({ page, director }) => {
      const dialog = addDialog(page);
      await director.press(dialog.getByRole('combobox', { name: 'Folder' }));
      await director.press(page.getByRole('option', { name: FOLDER_SAVE, exact: true }));
      await director.type(dialog.getByRole('combobox', { name: 'Tags' }), TAG_NEW);
      await page.keyboard.press('Enter');
      await expect(dialog.locator('ui-chip', { hasText: TAG_NEW })).toBeVisible();
      await director.pause(500);
      await director.press(dialog.getByRole('button', { name: 'Save link' }));
      await expect(dialog).toBeHidden();
      await expect(cards(page).filter({ hasText: LINK_TITLE }).first()).toBeVisible();
      await director.parkPointer();
      await director.pause(1600);
    },
  },
  {
    id: 'several',
    caption: { desktop: 'A pile of links? Paste them all at once.' },
    run: async ({ page, director }) => {
      await director.press(
        page.getByRole('button', { name: 'Add link' }).filter({ visible: true }).first(),
      );
      await director.press(addDialog(page).getByRole('button', { name: 'Add several links' }));
      const several = page.getByRole('dialog', { name: 'Add several links' });
      await several
        .getByRole('textbox', { name: 'Paste links, one per line or inside any text' })
        .fill(PASTED_LIST);
      await director.pause(900);
      await director.press(several.getByRole('button', { name: 'Find links' }));
      const many = page.getByRole('dialog', { name: /^Add \d+ links$/ });
      await expect(many.locator('.paste-many__row').first()).toBeVisible();
      await director.pause(1400);
      await director.press(many.getByRole('button', { name: /^Save \d+ links$/ }));
      await expect(many).toBeHidden();
      await director.parkPointer();
      await director.pause(1200);
    },
  },
  {
    id: 'style',
    chapter: 'Organise',
    caption: { desktop: 'Folders get a colour and an icon…' },
    run: async (context) => {
      const { page, director } = context;
      await folderMenu(context, FOLDER_STYLE, 'Colour and icon…');
      const dialog = page.getByRole('dialog', { name: FOLDER_STYLE });
      await expect(dialog).toBeVisible();
      for (const choice of ['Teal', 'Star']) {
        await director.pause(400);
        await director.press(
          dialog.locator('label.ui-choice', { has: page.getByLabel(choice, { exact: true }) }),
        );
      }
      await director.pause(600);
      await director.press(dialog.getByRole('button', { name: 'Save' }));
      await expect(dialog).toHaveCount(0);
      await director.pause(900);
    },
  },
  {
    id: 'pin',
    caption: { desktop: '…and the ones you use most stay pinned on top.' },
    run: async (context) => {
      const { page, director } = context;
      await folderMenu(context, FOLDER_STYLE, 'Pin to sidebar');
      await expect(
        page.locator('app-sidebar-pinned .pinned__item', { hasText: FOLDER_STYLE }),
      ).toBeVisible();
      await director.parkPointer();
      await director.pause(2200);
    },
  },
  {
    id: 'tags',
    caption: { desktop: 'A tag gathers its links from every folder.' },
    run: async (context) => {
      const { page, phone, director } = context;
      if (phone) {
        await pressTab(context, 'Tags');
        await openTags(page);
      }
      await director.press(
        page.locator('app-sidebar-tags').getByRole('button', { name: TAG_FILTER, exact: true }),
      );
      await expect(page.getByRole('group', { name: 'Active filters' })).toBeVisible();
      await director.parkPointer();
      await director.pause(2400);
    },
  },
  {
    id: 'search',
    chapter: 'Find',
    caption: { desktop: 'Need it again? Press ⌘K and type.', phone: 'Need it again? Tap Search.' },
    run: async ({ page, phone, director }) => {
      if (phone) {
        await director.press(
          page.getByRole('button', { name: SEARCH_BUTTON }).filter({ visible: true }).first(),
        );
      } else {
        await director.pause(400);
        await page.keyboard.press('Meta+k');
      }
      const field = page.getByRole('combobox', { name: 'Search links, folders and tags' });
      await expect(field).toBeVisible();
      await director.pause(500);
      await field.pressSequentially(QUERY, { delay: 120 });
      const hit = page.getByRole('option', { name: new RegExp(SEARCH_HIT) }).first();
      await expect(hit).toBeVisible();
      await director.point(hit);
      await director.pause(1600);
      await page.keyboard.press('Escape');
      await expect(field).toBeHidden();
    },
  },
  {
    id: 'views',
    caption: { desktop: 'Saved views keep the filters you use often.' },
    run: async (context) => {
      const { page, director } = context;
      await backToAllLinks(context);
      const views = page.getByRole('toolbar', { name: 'Saved views' });
      await director.press(views.getByRole('button', { name: /^Videos \d+$/ }));
      await expect(page).toHaveURL(/kind=video/);
      await director.parkPointer();
      await director.pause(1600);
      await director.press(views.getByRole('button', { name: /^All \d+$/ }));
      await director.pause(500);
    },
  },
  {
    id: 'favorites',
    caption: { desktop: 'Star the keepers; Favorites gathers them.' },
    run: async (context) => {
      const { page, director } = context;
      const star = cards(page)
        .first()
        .getByRole('button', { name: /^Favorite: / });
      await director.press(star);
      await expect(star).toHaveAttribute('aria-pressed', 'true');
      await director.pause(600);
      await director.press(await libraryEntry(context, 'Favorites'));
      await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
      await director.parkPointer();
      await director.pause(1400);
    },
  },
  {
    id: 'recent',
    caption: { desktop: 'Recently opened brings back what you read.' },
    run: async (context) => {
      const { page, phone, director } = context;
      await director.press(await libraryEntry(context, 'Recently opened'));
      if (phone) {
        const sheet = page.getByRole('dialog', { name: 'Recently opened' });
        await expect(sheet.locator('app-link-history-row').first()).toBeVisible();
        await director.pause(1600);
        await director.press(sheet.getByRole('button', { name: 'Close' }));
        await expect(sheet).toBeHidden();
      } else {
        await expect(page.locator('app-link-history-row').first()).toBeVisible();
        await director.parkPointer();
        await director.pause(1600);
      }
    },
  },
  {
    id: 'trash',
    caption: { desktop: 'Deleted by mistake? Trash keeps it for 30 days.' },
    run: async (context) => {
      const { page, phone, director } = context;
      await backToAllLinks(context);
      const card = cards(page).first();
      const title = (await card.getByRole('heading').innerText()).trim();
      await director.press(card.getByRole('button', { name: /^Actions for / }));
      await director.press(page.getByRole('menuitem', { name: 'Delete' }));
      await director.press(page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }));
      await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
      await director.pause(500);
      await director.press(await libraryEntry(context, 'Trash'));
      await expect(page.getByRole('heading', { level: 1, name: 'Trash' })).toBeVisible();
      await director.pause(700);
      const restore = page.getByRole('button', { name: `Restore ${title}`, exact: true });
      if (phone) {
        // The row's actions wait behind it on a phone; focus slides it aside, as a swipe would.
        await restore.focus();
        await director.pause(400);
      }
      await director.press(restore);
      await expect(page.getByText('Restored', { exact: true })).toBeVisible();
      await director.parkPointer();
      await director.pause(1000);
    },
  },
  {
    id: 'select',
    chapter: 'Many',
    caption: { desktop: 'Select several links and act on all of them at once.' },
    run: async (context) => {
      const { page, phone, director } = context;
      await backToAllLinks(context);
      const header = page.getByRole('group', { name: 'Selection' });
      if (phone) {
        await expect(cards(page).first()).toBeVisible();
        await director.reveal(cards(page).first());
        const box = await cards(page).nth(0).boundingBox();
        if (!box) {
          throw new Error('no card box');
        }
        const finger = await Finger.down(page, { x: box.x + box.width / 2, y: box.y + 40 });
        await finger.hold(750);
        await finger.up();
        await expect(header).toBeVisible();
        await director.pause(400);
        await director.press(cards(page).nth(1).locator('.ui-card__link'));
      } else {
        for (const index of [0, 1]) {
          const card = cards(page).nth(index);
          await director.point(card);
          await director.press(card.locator('ui-checkbox .ui-checkbox__box'));
        }
      }
      await expect(page.locator('.library__selected')).toContainText('2 selected');
      const bar = page.getByRole('toolbar', { name: /^Actions for \d+ selected/ });
      await director.pause(800);
      await director.press(bar.getByRole('button', { name: 'Move', exact: true }));
      const dialog = page.getByRole('dialog', { name: 'Move 2 links' });
      await director.press(dialog.getByRole('option').filter({ hasText: FOLDER_MOVE }).first());
      await expect(page.getByText(`2 links moved to ${FOLDER_MOVE}`)).toBeVisible();
      await director.parkPointer();
      await director.pause(1400);
    },
  },
  {
    id: 'drag',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'Or drag a card straight onto a folder.' },
    run: async ({ page, director }) => {
      const card = page.locator('li.library__item').nth(2);
      const folder = page.getByRole('treeitem', { name: new RegExp(`^${FOLDER_STYLE}\\b`) });
      const from = await card.boundingBox();
      const to = await folder.boundingBox();
      if (!from || !to) {
        throw new Error('no card or folder box');
      }
      const start = { x: from.x + from.width / 2, y: from.y + 40 };
      const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
      await page.mouse.move(start.x, start.y, { steps: 20 });
      await director.pause(300);
      await page.mouse.down();
      for (let step = 1; step <= 30; step++) {
        await page.mouse.move(
          start.x + ((end.x - start.x) * step) / 30,
          start.y + ((end.y - start.y) * step) / 30,
        );
        await director.pause(16);
      }
      await expect(folder).toContainText('Move here');
      await director.pause(700);
      await page.mouse.up();
      await expect(
        page.getByRole('status').filter({ hasText: `Moved to ${FOLDER_STYLE}` }),
      ).toBeVisible();
      await director.parkPointer();
      await director.pause(1600);
    },
  },
  {
    id: 'move',
    only: PROMO_DEVICE.Phone,
    caption: { desktop: 'Or move one link from its menu.' },
    run: async ({ page, director }) => {
      const card = cards(page).nth(2);
      const title = (await card.getByRole('heading').innerText()).trim();
      await director.press(card.getByRole('button', { name: /^Actions for / }));
      await director.press(page.getByRole('menuitem', { name: 'Move to folder…' }));
      const dialog = page.getByRole('dialog', { name: `Move “${title}”` });
      await director.press(dialog.getByRole('option').filter({ hasText: FOLDER_STYLE }).first());
      await expect(dialog).toBeHidden();
      await director.pause(1600);
    },
  },
  {
    id: 'theme',
    chapter: 'Yours',
    caption: { desktop: 'Light, dark, or your own accent colour.' },
    run: async (context) => {
      const { page, director } = context;
      await openSettings(context, 'Appearance');
      await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();
      const choice = (name: string) =>
        page
          .getByRole('radiogroup', { name: 'Theme' })
          .locator('label', { has: page.getByRole('radio', { name, exact: true }) })
          .first();
      await director.press(choice('Dark'));
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await director.pause(900);
      await director.press(choice('Custom'));
      // The own accent on the dark base, so the video stays dark to the end (#326).
      await director.press(
        page
          .getByRole('radiogroup', { name: 'Start from' })
          .locator('label', { has: page.getByRole('radio', { name: 'Dark', exact: true }) }),
      );
      await expect(page.locator('html')).toHaveAttribute('data-custom-base', 'dark');
      const swatch = page.getByRole('button', { name: 'Your own colour' });
      await director.press(swatch);
      const hex = page.getByRole('textbox', { name: 'Hex code' });
      await expect(hex).toBeFocused();
      await hex.fill('');
      await hex.pressSequentially(OWN_ACCENT, { delay: 90 });
      await hex.press('Enter');
      await expect(page.locator('html')).toHaveAttribute('data-custom-accent', 'own');
      await page.keyboard.press('Escape');
      await director.parkPointer();
      await director.pause(1400);
    },
  },
  {
    id: 'language',
    caption: { desktop: 'In six languages.' },
    run: async (context) => {
      const { page, director } = context;
      await openSettings(context, 'Language');
      // A plain list of languages with their flags (#315); names stay in their own language.
      const language = (name: string) =>
        page
          .getByRole('main')
          .getByRole('radiogroup')
          .locator('label', { has: page.getByRole('radio', { name, exact: true }) });
      await director.press(language('Français'));
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      await director.pause(1600);
      await director.press(language('English'));
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await director.pause(500);
    },
  },
  {
    id: 'export',
    caption: { desktop: 'Export everything, any time.' },
    run: async (context) => {
      const { page, director } = context;
      await openSettings(context, 'Export');
      const download = page.waitForEvent('download');
      await director.press(page.getByRole('main').getByRole('button', { name: 'JSON' }));
      await download;
      await director.parkPointer();
      await director.pause(1400);
    },
  },
  {
    id: 'feedback',
    caption: { desktop: 'And tell us what you think: we read every message.' },
    run: async (context) => {
      const { page, phone, director } = context;
      if (phone) {
        await pressTab(context, 'You');
        await director.press(page.getByRole('main').getByRole('button', { name: 'Send feedback' }));
      } else {
        await backToAllLinks(context);
        await director.press(
          page.locator('app-sidebar').getByRole('button', { name: 'Send feedback' }),
        );
      }
      const dialog = page.getByRole('dialog', { name: 'Send feedback' });
      await director.type(dialog.getByRole('textbox'), 'Calm and quick. More themes, please!');
      await director.press(dialog.getByRole('button', { name: 'Send', exact: true }));
      const done = page.getByRole('button', { name: 'Done' });
      await expect(done).toBeVisible();
      await director.pause(1200);
      await director.press(done);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    },
  },
  {
    id: 'share-target',
    only: PROMO_DEVICE.Phone,
    caption: { desktop: 'On the phone, share a link from any app straight to Shelfmark.' },
    run: async ({ page, director }) => {
      // The installed app is a share target: the system share sheet opens this address.
      await page.goto(`/share?url=${encodeURIComponent(SHARED_URL)}`);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Save to Shelfmark' }),
      ).toBeVisible();
      await director.pause(1400);
      await director.press(page.getByRole('button', { name: 'Save', exact: true }));
      await expect(page).toHaveURL(/\/links$/);
      await director.pause(1400);
    },
  },
  {
    id: 'share-folder',
    chapter: 'Share',
    caption: { desktop: 'With an account, share a folder as a public collection.' },
    run: async (context) => {
      const { page, director } = context;
      // Demo accounts cannot share: switch to a regular mock account on the same mockup library.
      await useShareAccount(page);
      await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
      // The look of "Make it yours" carries over (the mock appearance lives in this browser).
      await expect(page.locator('html')).toHaveAttribute('data-custom-base', 'dark');
      await expect(page.locator('html')).toHaveAttribute('data-custom-accent', 'own');
      await director.pause(700);
      await folderMenu(context, PROMO_SHARE.Folder, 'Share…');
      await expect(shareDialog(page)).toBeVisible();
      await director.pause(1200);
    },
  },
  {
    id: 'share-link',
    caption: { desktop: 'Make the folder public and copy its link.' },
    run: async ({ page, director }) => {
      const dialog = shareDialog(page);
      await director.press(dialog.getByRole('switch', { name: 'Public folder' }));
      // The mock shows the production origin under the showcase scenario, never localhost.
      await expect(dialog.getByLabel('Folder page address')).toHaveValue(
        new RegExp(`^${PROMO_SHARE.PublicOrigin.replaceAll('.', '\\.')}/c/[\\w-]{22}$`),
      );
      await director.pause(700);
      await director.press(dialog.getByRole('button', { name: 'Copy link' }));
      await expect(page.getByText('Folder link copied')).toBeVisible();
      await director.parkPointer();
      await director.pause(1600);
    },
  },
  {
    id: 'share-guest',
    caption: { desktop: 'Anyone with the link sees a read-only page, no account needed.' },
    run: async ({ page, director }) => {
      const dialog = shareDialog(page);
      const path = new URL(await dialog.getByLabel('Folder page address').inputValue()).pathname;
      await openAsGuest(page, path);
      await expect(page.getByRole('heading', { level: 1, name: PROMO_SHARE.Folder })).toBeVisible();
      await expect(page.getByText(`Shared by ${PROMO_SHARE.OwnerFirstName}`)).toBeVisible();
      await expect(cards(page).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /^Actions for / })).toHaveCount(0);
      await director.pause(1800);
      await director.reveal(cards(page).last());
      await director.pause(1400);
      await director.reveal(page.getByRole('link', { name: 'Start your shelf' }).first());
      await director.pause(800);
    },
  },
  {
    id: 'outro',
    caption: { desktop: 'Shelfmark. Every link, back within reach.' },
    run: async ({ director }) => {
      await director.pause(3000);
    },
  },
];

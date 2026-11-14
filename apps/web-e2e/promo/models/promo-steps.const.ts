import { expect, type Locator, type Page } from '@playwright/test';
import { SEARCH_BUTTON } from '../../src/support/search-button';
import { settled } from '../../src/support/settled';
import { openTags } from '../../src/support/sidebar';
import { Finger } from '../../src/support/touch';
import {
  backToAllLinks,
  dragTo,
  folderMenu,
  libraryEntry,
  loadPage,
  openAsGuest,
  openContextMenu,
  openSettings,
  pickChoice,
  pressTab,
  useShareAccount,
} from '../support/promo-flows';
import { HIDE_CURSOR_CSS } from '../support/promo-director';
import { PROMO_DEVICE } from './promo-device.const';
import { PROMO_SHARE } from './promo-share.const';
import type { PromoContext } from './promo-context.interface';
import type { PromoStep } from './promo-step.interface';

/** The link the video saves; the mock preview API answers "Page on <host>" for any new link. */
const LINK_URL = 'https://web.dev/articles/vitals';
const LINK_TITLE = 'Page on web.dev';
const LINK_NOTE = 'Check before the release';
/** A link the demo library already has (in Angular): the duplicate notice. */
const SAVED_URL = 'https://angular.dev/guide/zoneless';
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
/** The folder style of chapter 2: a color, and an emoji found through the picker's search. */
const FOLDER_COLOR = 'Teal';
const EMOJI_QUERY = 'dress';
const FOLDER_EMOJI = '👗';
const FOLDER_MOVE = 'Recipes';
const FOLDER_PARENT = 'Work';
const FOLDER_PINNED = 'Angular';
const FOLDER_NEW = 'Weekend baking';
const TAG_NEW = 'weekend';
const TAG_FILTER = 'angular';
const TAG_RENAME = 'reading';
const TAG_MERGE = 'docs';
const TAG_VIEW = 'design';
const VIEW_NAME = 'Design ideas';
/** Typed into the search: finds "Cacio e pepe, the easy way" of the demo. */
const QUERY = 'pepe';
const SEARCH_HIT = 'Cacio e pepe';
/** An own accent too dark for the dark base (the guard steps in), then one that passes (8:1). */
const FAINT_ACCENT = '#1f4d47';
const OWN_ACCENT = '#5cc2b5';
/** The link the phone shares into the app from another app (the PWA share target). */
const SHARED_URL = 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/';

/** The cards of the feed in the order shown. */
const cards = (page: Page) => page.locator('ui-card');
const addDialog = (page: Page) => page.getByRole('dialog', { name: 'Add link' });
const shareDialog = (page: Page) =>
  page.getByRole('dialog', { name: `Share folder “${PROMO_SHARE.Folder}”` });
const treeRow = (page: Page, name: string) =>
  page.getByRole('treeitem', { name: new RegExp(`^${name}\\b`) }).first();
const pinnedItems = (page: Page) => page.locator('app-sidebar-pinned .pinned__item');
const tagChip = (page: Page, name: string) =>
  page.locator('app-sidebar-tags').getByRole('button', { name, exact: true });
const bulkBar = (page: Page) => page.getByRole('toolbar', { name: /^Actions for \d+ selected/ });
const selectionHeader = (page: Page) => page.getByRole('group', { name: 'Selection' });
/** The public page of the shared folder, kept from the share dialog for the guest scene. */
const sharedPaths = new WeakMap<Page, string>();
const sharedPath = (page: Page): string => {
  const path = sharedPaths.get(page);
  if (!path) {
    throw new Error('no folder was shared');
  }
  return path;
};
const toast = (page: Page, text: string | RegExp) =>
  page.locator('ui-toast').filter({ hasText: text }).first();

async function openAddLink({ page, director }: PromoContext): Promise<Locator> {
  await director.press(
    page.getByRole('button', { name: 'Add link' }).filter({ visible: true }).first(),
  );
  const dialog = addDialog(page);
  await expect(dialog).toBeVisible();
  await director.pause(300);
  return dialog;
}

/** Scrolls the page smoothly until `target` sits in the middle, as a person would. */
async function glide({ director }: PromoContext, target: Locator): Promise<void> {
  await target.evaluate((element) =>
    element.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  );
  await director.pause(700);
}

/** Attaches a screenshot of the app as it is now to the feedback dialog, through its file picker. */
async function attachScreenshot({ page, director }: PromoContext, dialog: Locator): Promise<void> {
  const shot = await page.screenshot({ style: HIDE_CURSOR_CSS });
  const chooser = page.waitForEvent('filechooser');
  await director.press(dialog.getByRole('button', { name: 'choose files' }));
  await (await chooser).setFiles({ name: 'shelfmark.png', mimeType: 'image/png', buffer: shot });
  await expect(dialog.locator('.feedback-dialog__thumb')).toBeVisible();
  await director.pause(600);
}

/** Closes a tab that "Open all" opened behind the recording. */
function closeTab(tab: Page): void {
  void tab.close().catch(() => undefined);
}

/** Picks cards: the hover checkbox on desktop; a long press, then taps on the phone. */
async function pickCards(context: PromoContext, indexes: readonly number[]): Promise<void> {
  const { page, phone, director } = context;
  for (const [order, index] of indexes.entries()) {
    const card = cards(page).nth(index);
    if (phone && order === 0) {
      await director.reveal(card);
      const box = await card.boundingBox();
      if (!box) {
        throw new Error('no card box');
      }
      const finger = await Finger.down(page, { x: box.x + box.width / 2, y: box.y + 40 });
      await finger.hold(750);
      await finger.up();
      await expect(selectionHeader(page)).toBeVisible();
      await director.pause(300);
    } else if (phone) {
      await director.press(card.locator('.ui-card__link'));
    } else {
      await director.point(card);
      await director.press(card.locator('ui-checkbox .ui-checkbox__box'));
    }
  }
  await expect(page.locator('.library__selected')).toContainText(`${indexes.length} selected`);
}

/** Leaves the selection mode (Done on desktop, Cancel selection on the phone). */
async function endSelection({ page, phone, director }: PromoContext): Promise<void> {
  const header = selectionHeader(page);
  if ((await header.count()) === 0) {
    return;
  }
  await director.press(header.getByRole('button', { name: phone ? 'Cancel selection' : 'Done' }));
  await expect(header).toHaveCount(0);
}

/** Deletes a card from its menu and confirms; returns its title. */
async function deleteCard({ page, director }: PromoContext, card: Locator): Promise<string> {
  const link = card.locator('.ui-card__link');
  await expect(link).toHaveText(/\S/);
  const title = ((await link.textContent()) ?? '').trim();
  await director.press(card.getByRole('button', { name: /^Actions for / }));
  await director.press(page.getByRole('menuitem', { name: 'Delete' }));
  await director.press(page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }));
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  return title;
}

/**
 * The promo videos, step by step (#330: every feature, in short captioned scenes). Seven chapters
 * match the dialog: Save a link, Folders and tags, Many at once, Find it again, Undo and Trash,
 * Make it yours, Share and export; each recording has its own chapter times
 * (PROMO_CHAPTER_START_MS). A step with `only` runs on that device only: the desktop shows mouse
 * drags, the inline search and the shortcuts; the phone shows long presses, touch reorder, sheets
 * and installing the app with its share target.
 */
export const PROMO_STEPS: readonly PromoStep[] = [
  // Save a link
  {
    id: 'landing',
    chapter: 'Save',
    caption: { desktop: 'Shelfmark keeps every link you save in one place.' },
    run: async ({ director }) => {
      await director.pause(1400);
    },
  },
  {
    id: 'demo',
    caption: {
      desktop: 'Open the demo: no account needed.',
      phone: 'Open the demo: the tab bar keeps Library, Search, Add, Tags and You in reach.',
    },
    run: async ({ page, phone, director }) => {
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
      await director.pause(phone ? 2200 : 900);
    },
  },
  {
    id: 'paste',
    caption: { desktop: 'Paste a link: the preview fills in by itself.' },
    run: async (context) => {
      const { director } = context;
      const dialog = await openAddLink(context);
      await director.type(dialog.getByLabel('Link', { exact: true }), LINK_URL);
      await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(LINK_TITLE);
      await director.pause(800);
    },
  },
  {
    id: 'file',
    caption: { desktop: 'Pick a folder, add a tag and a note.' },
    run: async ({ page, director }) => {
      const dialog = addDialog(page);
      await director.press(dialog.getByRole('combobox', { name: 'Folder' }));
      await director.press(page.getByRole('option', { name: FOLDER_SAVE, exact: true }));
      await director.type(dialog.getByRole('combobox', { name: 'Tags' }), TAG_NEW);
      await page.keyboard.press('Enter');
      await expect(dialog.locator('ui-chip', { hasText: TAG_NEW })).toBeVisible();
      await director.type(dialog.getByLabel('Note'), LINK_NOTE);
      await director.pause(400);
    },
  },
  {
    id: 'save',
    caption: { desktop: 'Save, and the card lands in your feed.' },
    poster: true,
    run: async ({ page, director }) => {
      const dialog = addDialog(page);
      await director.press(dialog.getByRole('button', { name: 'Save link' }));
      await expect(dialog).toBeHidden();
      await expect(cards(page).filter({ hasText: LINK_TITLE }).first()).toBeVisible();
      await director.parkPointer();
      await director.pause(1300);
    },
  },
  {
    id: 'duplicate',
    caption: { desktop: 'Saved it before? Shelfmark tells you where.' },
    run: async (context) => {
      const { director } = context;
      const dialog = await openAddLink(context);
      await director.type(dialog.getByLabel('Link', { exact: true }), SAVED_URL);
      await expect(
        dialog.locator('ui-notice', { hasText: 'You already saved this link' }),
      ).toBeVisible();
      await director.pause(1300);
      await director.press(
        dialog.getByRole('button', { name: context.phone ? 'Close' : 'Cancel' }).first(),
      );
      await expect(dialog).toBeHidden();
    },
  },
  {
    id: 'several',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'A pile of links? Paste them all at once.' },
    run: async (context) => {
      const { page, director } = context;
      const dialog = await openAddLink(context);
      await director.press(dialog.getByRole('button', { name: 'Add several links' }));
      const several = page.getByRole('dialog', { name: 'Add several links' });
      await several
        .getByRole('textbox', { name: 'Paste links, one per line or inside any text' })
        .fill(PASTED_LIST);
      await director.pause(600);
      await director.press(several.getByRole('button', { name: 'Find links' }));
      const many = page.getByRole('dialog', { name: /^Add \d+ links$/ });
      await expect(many.locator('.paste-many__row').first()).toBeVisible();
      await director.pause(1000);
      await director.press(many.getByRole('button', { name: /^Save \d+ links$/ }));
      await expect(many).toBeHidden();
      await director.parkPointer();
      await director.pause(800);
    },
  },

  // Folders and tags
  {
    id: 'subfolder',
    chapter: 'Organise',
    caption: { desktop: 'Folders nest inside folders; a new one starts empty.' },
    run: async (context) => {
      const { page, director } = context;
      await folderMenu(context, FOLDER_MOVE, 'New subfolder');
      const dialog = page.getByRole('dialog', { name: `New folder in “${FOLDER_MOVE}”` });
      await director.type(dialog.getByLabel('Name'), FOLDER_NEW);
      await director.press(dialog.getByRole('button', { name: 'Create folder' }));
      await expect(page.getByRole('heading', { name: 'This folder is empty' })).toBeVisible();
      await director.parkPointer();
      await director.pause(1300);
    },
  },
  {
    id: 'style',
    caption: {
      desktop: 'Give a folder a color, and search for an emoji to go with it.',
      phone: 'Hold a folder for its menu: a color, and an emoji found by search.',
    },
    run: async (context) => {
      const { page, director } = context;
      await folderMenu(context, FOLDER_STYLE, 'Color and icon…', true);
      const dialog = page.getByRole('dialog', { name: FOLDER_STYLE });
      await expect(dialog).toBeVisible();
      await director.pause(200);
      await director.press(
        dialog.locator('label.ui-choice', { has: page.getByLabel(FOLDER_COLOR, { exact: true }) }),
      );
      await director.pause(200);
      // The emoji picker (#363): search, categories, Recent and Yours; the search finds it by name.
      await director.press(dialog.getByRole('combobox', { name: 'Emoji' }));
      const picker = page.getByRole('dialog', { name: 'Emoji', exact: true });
      const search = picker.getByRole('textbox', { name: 'Search emoji' });
      await expect(search).toBeVisible();
      await director.pause(300);
      await director.type(search, EMOJI_QUERY);
      const cell = picker.locator(`[data-emoji="${FOLDER_EMOJI}"]`).first();
      await expect(cell).toBeVisible();
      await director.pause(400);
      await director.press(cell);
      await expect(picker).toHaveCount(0);
      await expect(dialog.getByRole('combobox', { name: 'Emoji' })).toHaveValue(FOLDER_EMOJI);
      await director.pause(400);
      await director.press(dialog.getByRole('button', { name: 'Save' }));
      await expect(dialog).toHaveCount(0);
      await director.pause(500);
    },
  },
  {
    id: 'collapse',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'Fold a branch away and open it again.' },
    run: async (context) => {
      const { page, phone, director } = context;
      if (phone) {
        await libraryEntry(context, FOLDER_PARENT);
      }
      const row = treeRow(page, FOLDER_PARENT);
      const twist = row.locator('.ui-tree__twist').first();
      const expanded = (await row.getAttribute('aria-expanded')) === 'true';
      await director.press(twist);
      await expect(row).toHaveAttribute('aria-expanded', expanded ? 'false' : 'true');
      await director.pause(700);
      if (!expanded) {
        return;
      }
      await director.press(twist);
      await expect(row).toHaveAttribute('aria-expanded', 'true');
      await director.pause(600);
    },
  },
  {
    id: 'pin',
    caption: { desktop: 'Pin the folders you use most.' },
    run: async (context) => {
      const { page, director } = context;
      await folderMenu(context, FOLDER_STYLE, 'Pin to sidebar');
      await expect(pinnedItems(page).filter({ hasText: FOLDER_STYLE })).toBeVisible();
      await director.parkPointer();
      await director.pause(1000);
    },
  },
  {
    id: 'pin-reorder',
    caption: {
      desktop: 'Drag to reorder: a line shows where it lands.',
      phone: 'Hold and drag to reorder: a line shows where it lands.',
    },
    run: async (context) => {
      const { page, phone, director } = context;
      if (phone) {
        await libraryEntry(context, FOLDER_PARENT);
      }
      await expect(pinnedItems(page).nth(1)).toBeVisible();
      const first = pinnedItems(page).first();
      const name = (await first.innerText()).split('\n')[0]?.trim() ?? '';
      await dragTo(context, first, pinnedItems(page).nth(1), 'bottom', 700);
      await expect(pinnedItems(page).nth(1)).toContainText(name);
      await director.parkPointer();
      await director.pause(phone ? 900 : 700);
    },
  },
  {
    id: 'unpin',
    caption: { desktop: 'Unpin with one tap, Undo if you change your mind.' },
    run: async ({ page, director }) => {
      const row = pinnedItems(page).filter({ hasText: FOLDER_PINNED });
      const before = await pinnedItems(page).count();
      await director.point(row);
      await director.pause(300);
      await director.press(row.getByRole('button', { name: `Unpin ${FOLDER_PINNED}` }));
      await expect(toast(page, 'Unpinned from sidebar')).toBeVisible();
      await expect(pinnedItems(page)).toHaveCount(before - 1);
      await director.pause(1000);
    },
  },
  {
    id: 'folder-reorder',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'Folders reorder the same way.' },
    run: async (context) => {
      const { page, director } = context;
      const source = treeRow(page, FOLDER_MOVE);
      await dragTo(context, source, treeRow(page, FOLDER_STYLE), 'top', 700);
      await expect
        .poll(async () => {
          const names = await page
            .locator('app-sidebar ui-tree [data-ui-tree-id] .ui-tree__name')
            .allTextContents();
          return names.indexOf(FOLDER_MOVE) < names.indexOf(FOLDER_STYLE);
        })
        .toBe(true);
      await director.parkPointer();
      await director.pause(700);
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
      await director.press(tagChip(page, TAG_FILTER));
      await expect(page.getByRole('group', { name: 'Active filters' })).toBeVisible();
      await director.parkPointer();
      await director.pause(1400);
    },
  },
  {
    id: 'tag-merge',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'Rename a tag, or merge two into one.' },
    run: async (context) => {
      const { page, phone, director } = context;
      if (phone) {
        await pressTab(context, 'Tags');
        await openTags(page);
      }
      await openContextMenu(context, tagChip(page, TAG_RENAME));
      await director.press(page.getByRole('menuitem', { name: 'Rename' }));
      const field = page.locator('app-sidebar-tags').getByRole('textbox', { name: 'Tag name' });
      await field.fill('');
      await field.pressSequentially(TAG_MERGE, { delay: 90 });
      await field.press('Enter');
      const merge = page
        .locator('app-sidebar-tags')
        .getByRole('button', { name: new RegExp(`Merge into .${TAG_MERGE}.`) });
      await expect(merge).toBeVisible();
      await director.pause(800);
      await director.press(merge);
      await expect(tagChip(page, TAG_RENAME)).toHaveCount(0);
      await director.parkPointer();
      await director.pause(700);
    },
  },
  {
    id: 'favorites',
    caption: { desktop: 'Star the keepers; Favorites gathers them.' },
    run: async (context) => {
      const { page, director } = context;
      await backToAllLinks(context);
      const star = cards(page)
        .nth(1)
        .getByRole('button', { name: /^Favorite: / });
      await director.press(star);
      await expect(star).toHaveAttribute('aria-pressed', 'true');
      await director.pause(500);
      await director.press(await libraryEntry(context, 'Favorites'));
      await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
      await director.parkPointer();
      await director.pause(1000);
    },
  },

  // Many at once
  {
    id: 'move',
    chapter: 'Many',
    caption: {
      desktop: 'Move to folder: search the picker, the current folder is marked.',
      phone: 'Move to folder opens a sheet: search it, the current folder is marked.',
    },
    run: async (context) => {
      const { page, director } = context;
      await backToAllLinks(context);
      const card = cards(page).nth(2);
      await director.press(card.getByRole('button', { name: /^Actions for / }));
      await director.press(page.getByRole('menuitem', { name: 'Move to folder…' }));
      const picker = page.getByRole('dialog', { name: /^Move “/ });
      await expect(picker.getByRole('listbox', { name: 'Folders' })).toBeVisible();
      await director.point(picker.getByText('Current folder').first());
      await director.pause(800);
      await director.type(picker.getByRole('combobox', { name: 'Search folders' }), 'rec');
      await director.pause(600);
      await director.press(picker.getByRole('option', { name: FOLDER_MOVE, exact: true }));
      await expect(picker).toBeHidden();
    },
  },
  {
    id: 'move-undo',
    caption: { desktop: 'The toast has Undo, in case it was the wrong folder.' },
    run: async ({ page, director }) => {
      const moved = toast(page, `Moved to ${FOLDER_MOVE}`);
      await expect(moved).toBeVisible();
      await director.pause(600);
      await director.press(moved.getByRole('button', { name: 'Undo' }));
      await expect(moved).toBeHidden();
      await director.parkPointer();
      await director.pause(700);
    },
  },
  {
    id: 'drag',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'Or drag cards, several at once, onto a sidebar folder.' },
    run: async (context) => {
      const { page, director } = context;
      await pickCards(context, [3, 4]);
      const folder = treeRow(page, FOLDER_STYLE);
      await dragTo(context, page.locator('li.library__item').nth(4), folder, 'centre', 900, folder);
      await expect(toast(page, `2 links moved to ${FOLDER_STYLE}`)).toBeVisible();
      await director.parkPointer();
      await director.pause(1000);
    },
  },
  {
    id: 'select',
    caption: {
      desktop: 'Select links and tag them all at once…',
      phone: 'Hold a card to select, tap to add more…',
    },
    run: async (context) => {
      const { page, director } = context;
      await pickCards(context, [0, 1, 2]);
      await director.pause(500);
      await director.press(bulkBar(page).getByRole('button', { name: 'Tags', exact: true }));
      const dialog = page.getByRole('dialog', { name: 'Tags for 3 links' });
      await director.type(dialog.getByRole('combobox', { name: 'Add to all' }), 'to-read');
      await page.keyboard.press('Enter');
      await director.pause(400);
      await director.press(dialog.getByRole('button', { name: 'Apply' }));
      await expect(toast(page, 'Tags updated on 3 links')).toBeVisible();
      await director.pause(700);
    },
  },
  {
    id: 'bulk',
    caption: {
      desktop: '…favorite, copy or open them all, or move them together.',
      phone: '…favorite, copy, share or move them together.',
    },
    run: async (context) => {
      const { page, phone, director } = context;
      const bar = bulkBar(page);
      await director.press(bar.getByRole('button', { name: 'Favorite', exact: true }));
      await expect(toast(page, '3 links added to favorites')).toBeVisible();
      await director.pause(600);
      await director.press(bar.getByRole('button', { name: 'Copy links', exact: true }));
      await expect(toast(page, '3 links copied')).toBeVisible();
      await director.pause(600);
      if (!phone) {
        // The tabs open behind the recording; close them as they come.
        page.context().on('page', closeTab);
        await director.press(bar.getByRole('button', { name: 'Open all', exact: true }));
        await director.pause(700);
        page.context().off('page', closeTab);
      }
      await director.press(bar.getByRole('button', { name: 'Move', exact: true }));
      const picker = page.getByRole('dialog', { name: 'Move 3 links' });
      await expect(picker.getByRole('listbox', { name: 'Folders' })).toBeVisible();
      await director.pause(600);
      await director.press(picker.getByRole('option', { name: FOLDER_STYLE, exact: true }));
      await expect(toast(page, `3 links moved to ${FOLDER_STYLE}`)).toBeVisible();
      await endSelection(context);
      await director.parkPointer();
      await director.pause(800);
    },
  },

  // Find it again
  {
    id: 'search',
    chapter: 'Find',
    caption: {
      desktop: 'Need it again? Press ⌘K and type: results open under the field.',
      phone: 'Need it again? Tap Search and type.',
    },
    run: async ({ page, phone, director }) => {
      if (phone) {
        await director.press(
          page.getByRole('button', { name: SEARCH_BUTTON }).filter({ visible: true }).first(),
        );
      } else {
        await director.pause(300);
        await page.keyboard.press('Meta+k');
      }
      const field = page.getByRole('combobox', { name: 'Search links, folders and tags' });
      await expect(field).toBeVisible();
      await expect(field).toBeFocused();
      await director.pause(400);
      await field.pressSequentially(QUERY, { delay: 120 });
      const hit = page.getByRole('option', { name: new RegExp(SEARCH_HIT) }).first();
      await expect(hit).toBeVisible();
      await director.point(hit);
      await director.pause(1200);
      await page.keyboard.press('Escape');
      if (phone) {
        await expect(field).toBeHidden();
      } else {
        // From 80em the header field takes the shortcut (#329): the first Esc closes the results
        // panel, the second clears the text; the field stays in the header.
        await expect(hit).toBeHidden();
        await page.keyboard.press('Escape');
        await expect(field).toHaveValue('');
      }
    },
  },
  {
    id: 'views',
    caption: { desktop: 'Saved views sit above the feed: All, Videos, Articles…' },
    run: async (context) => {
      const { page, director } = context;
      await backToAllLinks(context);
      const views = page.getByRole('toolbar', { name: 'Saved views' });
      await director.press(views.getByRole('button', { name: /^Videos \d+$/ }));
      await expect(page).toHaveURL(/kind=video/);
      await director.pause(700);
      await director.press(views.getByRole('button', { name: /^Articles \d+$/ }));
      await director.pause(700);
      await director.press(views.getByRole('button', { name: /^All \d+$/ }));
      await director.pause(400);
    },
  },
  {
    id: 'save-view',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: '…and “Save this view” keeps any filter as a chip.' },
    run: async (context) => {
      const { page, phone, director } = context;
      if (phone) {
        await pressTab(context, 'Tags');
        await openTags(page);
      }
      await director.press(tagChip(page, TAG_VIEW));
      await expect(page.getByRole('group', { name: 'Active filters' })).toBeVisible();
      const views = page.getByRole('toolbar', { name: 'Saved views' });
      await director.press(views.getByRole('button', { name: 'Save this view' }));
      const dialog = page.getByRole('dialog', { name: 'Save this view' });
      await director.type(dialog.getByRole('textbox', { name: 'Name' }), VIEW_NAME);
      await director.press(dialog.getByRole('button', { name: 'Save view' }));
      await expect(views.getByRole('button', { name: new RegExp(`^${VIEW_NAME}`) })).toBeVisible();
      await director.parkPointer();
      await director.pause(1000);
    },
  },
  {
    id: 'sort-view',
    caption: {
      desktop: 'Sort it your way, and switch between cards and a list.',
      phone: 'Options: sort it your way, switch between cards and a list.',
    },
    run: async (context) => {
      const { page, phone, director } = context;
      await backToAllLinks(context);
      const viewMenu = page.getByRole('button', { name: 'Options', exact: true });
      if (phone) {
        await director.press(viewMenu);
      } else {
        await director.press(page.getByRole('button', { name: /^Sort: / }));
      }
      await director.pause(300);
      await director.press(page.getByRole('menuitemradio', { name: 'Title A–Z' }));
      await director.pause(700);
      const pickView = async (view: 'Cards' | 'List'): Promise<void> => {
        if (phone) {
          await director.press(viewMenu);
          await director.press(page.getByRole('menuitemradio', { name: view }));
        } else {
          await director.press(page.getByRole('radio', { name: view }));
        }
      };
      await pickView('List');
      await expect(page.locator('ui-list-item').first()).toBeVisible();
      await director.parkPointer();
      await director.pause(1000);
      await pickView('Cards');
      await expect(cards(page).first()).toBeVisible();
      await director.pause(700);
    },
  },
  {
    id: 'recent',
    caption: { desktop: 'Recently opened: filter, search, or pause the history.' },
    run: async (context) => {
      const { page, phone, director } = context;
      await director.press(await libraryEntry(context, 'Recently opened'));
      const scope = phone
        ? page.getByRole('dialog', { name: 'Recently opened' })
        : page.getByRole('main');
      await expect(scope.locator('app-link-history-row').first()).toBeVisible();
      await director.pause(600);
      const filter = scope.getByRole('toolbar', { name: 'Filter by type' });
      if ((await filter.count()) > 0) {
        await director.press(filter.getByRole('button', { name: /^Articles \d+$/ }));
        await director.pause(600);
      }
      const search = scope.getByRole('searchbox', { name: 'Search history' });
      if ((await search.count()) > 0) {
        await director.type(search, 'signal');
        await director.pause(600);
      }
      const pause = scope.getByRole('button', { name: 'Pause history' });
      if ((await pause.count()) > 0) {
        await director.press(pause);
        await expect(scope.getByRole('button', { name: 'Resume history' })).toBeVisible();
        await director.pause(800);
        await director.press(scope.getByRole('button', { name: 'Resume history' }));
      }
      await director.pause(500);
      if (phone) {
        await director.press(scope.getByRole('button', { name: 'Close' }));
        await expect(scope).toBeHidden();
      }
    },
  },
  {
    id: 'empty-search',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'Nothing there? Every empty page says what to do next.' },
    run: async (context) => {
      const { page, phone, director } = context;
      const scope = phone
        ? page.getByRole('dialog', { name: 'Recently opened' })
        : page.getByRole('main');
      const search = scope.getByRole('searchbox', { name: 'Search history' });
      if ((await search.count()) > 0) {
        await search.fill('');
        await search.pressSequentially('zebra', { delay: 90 });
        await expect(scope.getByRole('heading', { name: 'Nothing matches' })).toBeVisible();
        await director.parkPointer();
        await director.pause(1200);
        await director.press(
          scope.locator('ui-empty-state').getByRole('button', { name: 'Clear search' }),
        );
      } else {
        await director.pause(1200);
      }
      await director.pause(400);
    },
  },

  // Undo and Trash
  {
    id: 'delete-undo',
    chapter: 'Safety',
    caption: { desktop: 'Deleted by mistake? Undo brings it right back.' },
    run: async (context) => {
      const { page, director } = context;
      await backToAllLinks(context);
      const title = await deleteCard(context, cards(page).first());
      const deleted = toast(page, 'Moved to Trash');
      await expect(deleted).toBeVisible();
      await director.pause(600);
      await director.press(deleted.getByRole('button', { name: 'Undo' }));
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await director.parkPointer();
      await director.pause(800);
    },
  },
  {
    id: 'trash',
    caption: { desktop: 'Trash keeps what you delete; restore it any time.' },
    run: async (context) => {
      const { page, phone, director } = context;
      const title = await deleteCard(context, cards(page).first());
      await director.pause(400);
      await director.press(await libraryEntry(context, 'Trash'));
      await expect(page.getByRole('heading', { level: 1, name: 'Trash' })).toBeVisible();
      await director.pause(600);
      const restore = page.getByRole('button', { name: `Restore ${title}`, exact: true });
      if (phone) {
        // The row's actions wait behind it on a phone; focus slides it aside, as a swipe would.
        await restore.focus();
        await director.pause(400);
      }
      await director.press(restore);
      await expect(page.getByText('Restored', { exact: true })).toBeVisible();
      await director.parkPointer();
      await director.pause(700);
    },
  },
  {
    id: 'retention',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'You choose how long Trash keeps it.' },
    run: async (context) => {
      const { page, director } = context;
      await openSettings(context, 'Library');
      await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
      const radio = page.getByRole('radio', { name: '90 days', exact: true });
      // The control is disabled until the settings have loaded.
      await expect(radio).toBeEnabled();
      await expect(page.locator('ui-segmented-control.ui-seg--disabled')).toHaveCount(0);
      await director.pause(300);
      await director.press(page.locator('label', { has: radio }).first());
      await expect(radio).toBeChecked();
      await director.parkPointer();
      await director.pause(1000);
    },
  },

  // Make it yours
  {
    id: 'theme',
    chapter: 'Yours',
    caption: { desktop: 'Light, dark, or Custom with your own accent color…' },
    run: async (context) => {
      const { page, director } = context;
      await openSettings(context, 'Appearance');
      await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();
      await pickChoice(context, 'Theme', 'Dark');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await director.pause(600);
      await pickChoice(context, 'Theme', 'Custom');
      // The own accent on the dark base, so the video stays dark to the end (#326).
      await pickChoice(context, 'Start from', 'Dark');
      await expect(page.locator('html')).toHaveAttribute('data-custom-base', 'dark');
      await director.pause(400);
    },
  },
  {
    id: 'accent',
    caption: { desktop: '…and Shelfmark keeps it readable: 4.5:1 contrast, always.' },
    run: async ({ page, director }) => {
      const swatch = page.getByRole('button', { name: 'Your own color' });
      await director.press(swatch);
      const hex = page.getByRole('textbox', { name: 'Hex code' });
      await expect(hex).toBeFocused();
      await hex.fill('');
      await hex.pressSequentially(FAINT_ACCENT, { delay: 80 });
      // The picker chooses only on "Add color" (#335); a colour that fails 4.5:1 is refused.
      const add = page.getByRole('button', { name: 'Add color' }).filter({ visible: true }).first();
      await director.press(add);
      await expect(page.getByText(/hard to read on your background/u)).toBeVisible();
      await director.pause(1300);
      await hex.fill('');
      await hex.pressSequentially(OWN_ACCENT, { delay: 80 });
      await director.press(add);
      await expect(page.locator('html')).toHaveAttribute('data-custom-accent', 'own');
      await expect(page.getByText(/hard to read on your background/u)).toHaveCount(0);
      await director.parkPointer();
      await director.pause(800);
    },
  },
  {
    id: 'appearance',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'Text size, font, density and cards, with a live preview.' },
    run: async (context) => {
      const { director } = context;
      await pickChoice(context, 'Text size', '112%');
      await director.pause(500);
      await pickChoice(context, 'Font', 'Readable');
      await director.pause(500);
      await pickChoice(context, 'Density', 'Compact');
      await director.pause(400);
      await pickChoice(context, 'Preview image', 'Small');
      await director.pause(700);
      // Back to the defaults, so the rest of the tour looks as it started.
      await pickChoice(context, 'Preview image', 'Large');
      await pickChoice(context, 'Density', 'Comfortable');
      await pickChoice(context, 'Font', 'Onest');
      await pickChoice(context, 'Text size', '100%');
      await director.pause(400);
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
      await director.pause(1200);
      await director.press(language('English'));
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await director.pause(400);
    },
  },
  {
    id: 'shortcuts',
    only: PROMO_DEVICE.Desktop,
    caption: { desktop: 'Press ? for every keyboard shortcut.' },
    run: async (context) => {
      const { page, director } = context;
      await backToAllLinks(context);
      await director.parkPointer();
      // Focus leaves the sidebar row, whose type-ahead would take the key.
      await page.evaluate('document.activeElement?.blur()');
      await director.pause(300);
      await page.keyboard.press('?');
      const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
      await expect(dialog).toBeVisible();
      await director.pause(1800);
      await director.press(dialog.getByRole('button', { name: 'Close' }));
      await expect(dialog).toHaveCount(0);
    },
  },
  {
    id: 'feedback',
    caption: {
      desktop: 'And tell us what you think, with a screenshot if it helps.',
      phone: 'And tell us what you think: we read every message.',
    },
    run: async (context) => {
      const { page, phone, director } = context;
      if (phone) {
        await pressTab(context, 'You');
        await director.press(page.getByRole('main').getByRole('button', { name: 'Send feedback' }));
      } else {
        await director.press(
          page.locator('app-sidebar').getByRole('treeitem', { name: 'Send feedback' }),
        );
      }
      const dialog = page.getByRole('dialog', { name: 'Send feedback' });
      await director.type(dialog.getByRole('textbox'), 'Calm and quick. More themes, please!');
      if (!phone) {
        // Up to three screenshots can go with it (the phone skips this to keep its pace).
        await attachScreenshot(context, dialog);
      }
      await director.press(dialog.getByRole('button', { name: 'Send', exact: true }));
      const done = page.getByRole('button', { name: 'Done' });
      await expect(done).toBeVisible();
      await director.pause(800);
      await director.press(done);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    },
  },

  // Share and export
  {
    id: 'share-folder',
    chapter: 'Share',
    caption: { desktop: 'With an account, share a folder as a public page.' },
    run: async (context) => {
      const { page, director } = context;
      // Demo accounts cannot share: switch to a regular mock account on the same mockup library.
      await useShareAccount(context);
      await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
      // The look of "Make it yours" carries over (the mock appearance lives in this browser).
      await expect(page.locator('html')).toHaveAttribute('data-custom-base', 'dark');
      await expect(page.locator('html')).toHaveAttribute('data-custom-accent', 'own');
      await director.pause(500);
      await folderMenu(context, PROMO_SHARE.Folder, 'Share…');
      await expect(shareDialog(page)).toBeVisible();
      await director.pause(700);
    },
  },
  {
    id: 'share-link',
    caption: { desktop: 'Make it public and copy its link.' },
    run: async ({ page, director }) => {
      const dialog = shareDialog(page);
      await director.press(dialog.getByRole('switch', { name: 'Public folder' }));
      // The mock shows the production origin under the showcase scenario, never localhost.
      const address = dialog.getByLabel('Folder page address');
      await expect(address).toHaveValue(
        new RegExp(`^${PROMO_SHARE.PublicOrigin.replaceAll('.', '\\.')}/c/[\\w-]{22}$`),
      );
      await director.pause(600);
      await director.press(dialog.getByRole('button', { name: 'Copy link' }));
      await expect(page.getByText('Folder link copied')).toBeVisible();
      // The guest opens the same page later, after the dialog is closed.
      sharedPaths.set(page, new URL(await address.inputValue()).pathname);
      await director.parkPointer();
      await director.pause(1000);
    },
  },
  {
    id: 'rating',
    caption: { desktop: 'Now and then Shelfmark asks how you like it: one tap.' },
    run: async ({ page, director }) => {
      const dialog = shareDialog(page);
      await director.press(dialog.getByRole('button', { name: 'Done' }));
      await expect(dialog).toBeHidden();
      const rating = page.getByRole('dialog', { name: 'How do you like Shelfmark so far?' });
      await expect(rating).toBeVisible({ timeout: 8000 });
      await director.pause(700);
      await director.press(rating.getByRole('button', { name: '9 out of 10' }));
      const thanks = page.getByRole('dialog', { name: 'Thank you' });
      await expect(thanks).toBeVisible();
      await director.pause(800);
      await director.press(thanks.getByRole('button', { name: 'Close' }));
      await expect(page.getByRole('dialog')).toHaveCount(0);
    },
  },
  {
    id: 'account',
    caption: {
      desktop: 'Your account: the photo you sign in with, your shelf in numbers…',
    },
    run: async (context) => {
      const { page, phone, director } = context;
      if (phone) {
        await pressTab(context, 'You');
        await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible();
        await settled(page);
        await director.press(page.getByRole('main').getByRole('link', { name: /^Account: / }));
      } else {
        await openSettings(context, 'Account');
      }
      await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
      // The numbers have loaded once the connected accounts show.
      await expect(page.getByRole('heading', { name: 'Connected accounts' })).toBeVisible();
      await director.parkPointer();
      await director.pause(1300);
      if (phone) {
        // The phone shows one section at a time: the connected account comes next.
        await glide(context, page.getByRole('heading', { name: 'Connected accounts' }));
        await director.pause(700);
      }
    },
  },
  {
    id: 'export',
    caption: { desktop: '…and Your data: export everything as JSON or a bookmarks file.' },
    run: async (context) => {
      const { page, director } = context;
      const json = page.getByRole('button', { name: 'Download JSON' });
      await glide(context, page.getByRole('button', { name: 'Download Bookmarks HTML' }));
      await director.point(page.getByRole('button', { name: 'Download Bookmarks HTML' }));
      await director.pause(500);
      const download = page.waitForEvent('download');
      await director.press(json);
      await download;
      await director.parkPointer();
      await director.pause(800);
    },
  },
  {
    id: 'install',
    only: PROMO_DEVICE.Phone,
    caption: { desktop: 'Install Shelfmark from the browser menu and it joins your Share menu.' },
    run: async (context) => {
      const { page, director } = context;
      const heading = page.getByRole('heading', { name: 'Save from your phone' });
      await loadPage(context, '/about', heading);
      await director.reveal(heading);
      await director.pause(1800);
    },
  },
  {
    id: 'share-target',
    only: PROMO_DEVICE.Phone,
    caption: { desktop: 'Share a page from any app, and it lands on your shelf.' },
    run: async (context) => {
      const { page, director } = context;
      // The installed app is a share target: the system share sheet opens this address.
      await loadPage(
        context,
        `/share?url=${encodeURIComponent(SHARED_URL)}`,
        page.getByRole('heading', { level: 1, name: 'Save to Shelfmark' }),
      );
      await director.pause(1000);
      await director.press(page.getByRole('button', { name: 'Save', exact: true }));
      await expect(page).toHaveURL(/\/links$/);
      await director.pause(1000);
    },
  },
  {
    id: 'share-guest',
    caption: { desktop: 'Anyone with the link sees a read-only page, no account needed.' },
    run: async (context) => {
      const { page, director } = context;
      await openAsGuest(
        context,
        sharedPath(page),
        page.getByRole('heading', { level: 1, name: PROMO_SHARE.Folder }),
      );
      await expect(page.getByText(`Shared by ${PROMO_SHARE.OwnerFirstName}`)).toBeVisible();
      await expect(cards(page).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /^Actions for / })).toHaveCount(0);
      await director.pause(1000);
      await director.reveal(cards(page).last());
      await director.pause(800);
      await director.reveal(page.getByRole('link', { name: 'Start your shelf' }).first());
      await director.pause(600);
    },
  },
  {
    id: 'outro',
    caption: { desktop: 'Shelfmark. Every link, back within reach.' },
    run: async ({ director }) => {
      await director.pause(2000);
    },
  },
];

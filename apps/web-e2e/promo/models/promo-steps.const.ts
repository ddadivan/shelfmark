import { expect } from '@playwright/test';
import { SEARCH_BUTTON } from '../../src/support/search-button';
import { openSidebar, openTags } from '../../src/support/sidebar';
import type { PromoStep } from './promo-step.interface';

/** The link the video saves; the mock preview API answers "Page on web.dev". */
const LINK_URL = 'https://web.dev/articles/vitals';
const LINK_TITLE = 'Page on web.dev';
/** A folder of the mock demo library (MOCK_FOLDERS in the contracts' testing data). */
const FOLDER = 'Reading';
const TAG = 'weekend';
/** Typed into the search: matches the saved link's title (search covers titles, notes, folders, tags). */
const QUERY = 'web.dev';

/**
 * The promo video, step by step (HowItWorks.dc.html: "Shelfmark in 60 seconds"). Chapters match
 * the dialog: Save a link 0:00, Folders and tags 0:18, Find it again 0:41. Pauses are tuned so
 * each chapter's last step ends a little before the next start; the recorder holds the rest.
 */
export const PROMO_STEPS: readonly PromoStep[] = [
  {
    id: 'landing',
    chapter: 'Save',
    caption: { desktop: 'Shelfmark keeps every link you save in one place.' },
    run: async ({ director }) => {
      await director.pause(2600);
    },
  },
  {
    id: 'demo',
    caption: { desktop: 'Open the demo: no account needed.' },
    run: async ({ page, director }) => {
      await director.press(
        page.getByRole('link', { name: 'Open the demo' }).filter({ visible: true }).first(),
      );
      await expect(page).toHaveURL(/\/links$/);
      const welcome = page.getByRole('dialog');
      await expect(welcome).toBeVisible();
      await director.pause(900);
      await director.press(welcome.getByRole('button', { name: 'Skip' }));
      await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
      await director.parkPointer();
      await director.pause(1200);
    },
  },
  {
    id: 'paste',
    caption: { desktop: 'Paste a link.' },
    run: async ({ page, director }) => {
      await director.press(
        page.getByRole('button', { name: 'Add link' }).filter({ visible: true }).first(),
      );
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await expect(dialog).toBeVisible();
      await director.pause(500);
      await director.type(dialog.getByLabel('Link', { exact: true }), LINK_URL);
    },
  },
  {
    id: 'preview',
    caption: { desktop: 'The preview fills in by itself.' },
    run: async ({ page, director }) => {
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(LINK_TITLE);
      await director.pause(2000);
    },
  },
  {
    id: 'folder',
    chapter: 'Organise',
    caption: { desktop: 'Put it in a folder…' },
    run: async ({ page, director }) => {
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await director.press(dialog.getByRole('combobox', { name: 'Folder' }));
      await director.pause(800);
      await director.press(page.getByRole('option', { name: FOLDER, exact: true }));
      await director.pause(900);
    },
  },
  {
    id: 'tag',
    caption: { desktop: '…and give it a tag.' },
    run: async ({ page, director }) => {
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await director.type(dialog.getByRole('combobox', { name: 'Tags' }), TAG);
      await director.pause(700);
      await page.keyboard.press('Enter');
      await expect(dialog.locator('ui-chip', { hasText: TAG })).toBeVisible();
      await director.pause(1200);
    },
  },
  {
    id: 'save',
    caption: { desktop: 'Save it, and it lands on your shelf.' },
    poster: true,
    run: async ({ page, director }) => {
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await director.press(dialog.getByRole('button', { name: 'Save link' }));
      await expect(dialog).toBeHidden();
      await expect(page.locator('ui-card', { hasText: LINK_TITLE }).first()).toBeVisible();
      await director.parkPointer();
      await director.pause(3200);
    },
  },
  {
    id: 'shelf',
    caption: { desktop: 'Folders and tags keep the shelf in order.' },
    run: async ({ page, phone, director }) => {
      if (phone) {
        await director.press(
          page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library' }),
        );
        await openSidebar(page);
        await director.pause(900);
      }
      // The folder tree: in the sidebar, or on the Library page on a phone.
      await director.press(page.getByRole('treeitem', { name: new RegExp(`^${FOLDER}\\b`) }));
      await expect(page.locator('ui-card', { hasText: LINK_TITLE }).first()).toBeVisible();
      await director.parkPointer();
      await director.pause(2500);
    },
  },
  {
    id: 'tag-filter',
    caption: { desktop: 'A tag gathers its links from every folder.' },
    run: async ({ page, phone, director }) => {
      if (phone) {
        await director.press(
          page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Tags' }),
        );
        await openTags(page);
        await director.pause(900);
      }
      // The same tags section: in the sidebar, or the page of the Tags tab on a phone.
      await director.press(
        page.locator('app-sidebar-tags').getByRole('button', { name: TAG, exact: true }),
      );
      await expect(page.locator('ui-card', { hasText: LINK_TITLE }).first()).toBeVisible();
      await director.parkPointer();
      await director.pause(2500);
    },
  },
  {
    id: 'search',
    chapter: 'Find',
    caption: { desktop: 'Need it again? Press ⌘K.', phone: 'Need it again? Tap Search.' },
    run: async ({ page, phone, director }) => {
      if (phone) {
        await director.press(
          page.getByRole('button', { name: SEARCH_BUTTON }).filter({ visible: true }).first(),
        );
      } else {
        await director.pause(600);
        await page.keyboard.press('Meta+k');
      }
      await expect(
        page.getByRole('combobox', { name: 'Search links, folders and tags' }),
      ).toBeVisible();
      await director.pause(900);
    },
  },
  {
    id: 'query',
    caption: { desktop: 'Search finds titles, notes, folders and tags.' },
    run: async ({ page, director }) => {
      const field = page.getByRole('combobox', { name: 'Search links, folders and tags' });
      await field.pressSequentially(QUERY, { delay: 120 });
      const result = page.getByRole('option', { name: new RegExp(LINK_TITLE) }).first();
      await expect(result).toBeVisible();
      await director.pause(1400);
      await director.point(result);
      await director.pause(2600);
    },
  },
  {
    id: 'outro',
    caption: { desktop: 'Shelfmark. Every link, back within reach.' },
    run: async ({ director }) => {
      await director.pause(3500);
    },
  },
];

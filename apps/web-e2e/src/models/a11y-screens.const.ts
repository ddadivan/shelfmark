import { expect } from '@playwright/test';
import {
  openCardEdit,
  openEmptyFeed,
  openFeed,
  openSignedIn,
  pickFolderMenuItem,
  pickTagMenuItem,
} from '../support/a11y-flows';
import { NEW_USER, seedSession } from '../support/mock-session';
import { openSidebar } from '../support/sidebar';
import type { A11yScreen } from './a11y-screen.interface';
import { ACCOUNT_MENU_LABEL_RULE } from './axe-account-menu-rule.const';
import { MOCK } from './mock-ids.const';

const DIALOG = '.cdk-dialog-container';
const DUPLICATE_URL = 'https://angular.dev/overview';
const PAGE_RULES = { disabledRules: [ACCOUNT_MENU_LABEL_RULE] } as const;

/** Every app screen the accessibility pass scans, in both themes and on both projects. */
export const A11Y_SCREENS: readonly A11yScreen[] = [
  {
    name: 'sign-in',
    open: async (page) => {
      await page.goto('/sign-in');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    },
  },
  { name: 'feed, cards', open: (page) => openFeed(page), ...PAGE_RULES },
  {
    name: 'feed, list',
    open: async (page) => {
      await openFeed(page);
      await page.getByRole('radio', { name: 'List' }).click();
      await expect(page.locator('ui-list-item').first()).toBeVisible();
    },
    ...PAGE_RULES,
  },
  {
    name: 'folder view',
    open: async (page) => {
      await openFeed(page, `/folders/${MOCK.readingId}`);
      await expect(page.getByRole('heading', { level: 1, name: MOCK.readingName })).toBeVisible();
    },
    ...PAGE_RULES,
  },
  {
    name: 'empty folder',
    open: async (page) => {
      await openFeed(page);
      await openSidebar(page);
      await page.getByRole('button', { name: 'New folder' }).click();
      const dialog = page.getByRole('dialog', { name: 'New folder' });
      await dialog.getByLabel('Name').fill('Projects');
      await dialog.getByRole('button', { name: 'Create folder' }).click();
      await expect(page.getByRole('heading', { name: 'This folder is empty' })).toBeVisible();
    },
    ...PAGE_RULES,
  },
  {
    name: 'empty feed',
    open: (page) => openEmptyFeed(page),
    ...PAGE_RULES,
  },
  {
    name: 'tag filter',
    open: async (page) => {
      await openFeed(page, `/links?tag=${MOCK.tagDocs}`);
      await expect(page.getByRole('group', { name: 'Active filters' })).toBeVisible();
    },
    ...PAGE_RULES,
  },
  {
    name: 'search, nothing found',
    open: async (page) => {
      await openSignedIn(page, '/links?q=zzzzqq');
      await expect(page.getByRole('heading', { name: 'Nothing found for “zzzzqq”' })).toBeVisible();
    },
    ...PAGE_RULES,
  },
  {
    name: 'search dialog',
    open: async (page) => {
      await openFeed(page);
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page
        .getByRole('combobox', { name: 'Search links, folders and tags' })
        .fill(MOCK.searchWord);
      await expect(page.getByRole('option').first()).toBeVisible();
      await expect(page.getByRole('listbox')).not.toHaveAttribute('aria-busy', 'true');
    },
    include: DIALOG,
  },
  {
    name: 'settings',
    open: async (page) => {
      await openSignedIn(page, '/settings');
      await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    },
    ...PAGE_RULES,
  },
  {
    name: 'add link dialog',
    open: async (page) => {
      await openFeed(page);
      await page.getByRole('button', { name: 'Add link' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await dialog.getByLabel('Link', { exact: true }).fill(DUPLICATE_URL);
      await expect(dialog.getByRole('button', { name: 'Open saved' })).toBeVisible();
    },
    include: DIALOG,
  },
  {
    name: 'edit link dialog',
    open: async (page) => {
      await openFeed(page);
      await openCardEdit(page);
    },
    include: DIALOG,
  },
  {
    name: 'delete link confirmation',
    open: async (page) => {
      await openFeed(page);
      await openCardEdit(page);
      await page
        .getByRole('dialog', { name: 'Edit link' })
        .getByRole('button', { name: 'Delete' })
        .click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
    },
    include: DIALOG,
  },
  {
    name: 'new folder dialog',
    open: async (page) => {
      await openFeed(page);
      await openSidebar(page);
      await page.getByRole('button', { name: 'New folder' }).click();
      await expect(page.getByRole('dialog', { name: 'New folder' })).toBeVisible();
    },
    include: DIALOG,
  },
  {
    name: 'move folder dialog',
    open: async (page) => {
      await openFeed(page);
      await pickFolderMenuItem(page, 'Move to…');
      await expect(page.getByRole('dialog', { name: `Move “${MOCK.readingName}”` })).toBeVisible();
    },
    include: DIALOG,
  },
  {
    name: 'delete folder dialog',
    open: async (page) => {
      await openFeed(page);
      await pickFolderMenuItem(page, 'Delete folder…');
      await expect(page.getByRole('dialog', { name: /^Delete folder/ })).toBeVisible();
    },
    include: `${DIALOG}[aria-labelledby]`,
  },
  {
    name: 'merge tag dialog',
    open: async (page) => {
      await openFeed(page);
      await pickTagMenuItem(page, MOCK.tagDocs, 'Merge into another tag…');
      await expect(page.getByRole('dialog', { name: /Merge/ })).toBeVisible();
    },
    include: DIALOG,
  },
  {
    name: 'delete tag confirmation',
    open: async (page) => {
      await openFeed(page);
      await pickTagMenuItem(page, MOCK.tagDocs, 'Delete tag');
      await expect(page.getByRole('alertdialog')).toBeVisible();
    },
    include: DIALOG,
  },
  {
    name: 'onboarding dialog',
    open: async (page) => {
      await seedSession(page, NEW_USER);
      await page.goto('/links');
      await expect(page.getByRole('dialog', { name: 'All your links in one place' })).toBeVisible();
    },
    include: DIALOG,
  },
  {
    name: 'phone drawer',
    only: 'phone',
    open: async (page) => {
      await openFeed(page);
      await openSidebar(page);
      await expect(
        page.getByRole('dialog', { name: 'Menu' }).getByRole('treeitem', { name: /^All links/ }),
      ).toBeVisible();
    },
    include: '[role="dialog"][aria-label="Menu"]',
  },
];

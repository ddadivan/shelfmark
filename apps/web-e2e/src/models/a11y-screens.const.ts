import { expect } from '@playwright/test';
import { openCardMove, openFeed, openSignedIn } from '../support/a11y-flows';
import { SEARCH_BUTTON, SEARCH_FIELD_NAME, useSearchDialogWidth } from '../support/search-button';
import { openSidebar, openTags } from '../support/sidebar';
import { deleteFirstLink, deleteReadingFolderWithLinks, openTrash } from '../support/trash';
import type { A11yScreen } from './a11y-screen.interface';
import { DIALOG_SELECTOR } from './dialog-selector.const';
import { E2E_PROJECT } from './e2e-project.const';
import { E2E_TAG } from './e2e-tag.const';
import { MOCK_FIXTURE } from './mock-fixture.const';
import { switchView } from '../support/library-toolbar';

const DUPLICATE_URL = 'https://angular.dev/overview';
// A dialog that becomes a bottom sheet on a phone is scanned on both projects.
const SHEET = { include: DIALOG_SELECTOR } as const;

/**
 * The key app screens the accessibility pass scans in both themes (ADR 0043, #349): the main
 * pages, the search surfaces and the dialogs whose layout changes on a phone. Every other dialog,
 * menu and state has a jsdom axe test in its component spec, and the libs/ui parts are scanned for
 * contrast in both themes by the Storybook axe run.
 */
export const A11Y_SCREENS: readonly A11yScreen[] = [
  {
    name: 'sign-in',
    open: async (page) => {
      await page.goto('/sign-in');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    },
  },
  { name: 'feed, cards', tag: E2E_TAG.Phone, open: (page) => openFeed(page) },
  {
    name: 'feed, list',
    open: async (page) => {
      await openFeed(page);
      await switchView(page, 'List');
      await expect(page.locator('ui-list-item').first()).toBeVisible();
    },
  },
  {
    name: 'trash with a link and a folder',
    open: async (page) => {
      await openFeed(page);
      await deleteFirstLink(page);
      // Opening Trash sends the delete that still waits for its Undo window.
      await openTrash(page);
      await deleteReadingFolderWithLinks(page);
      await openTrash(page);
      await expect(page.locator('app-trash-row')).toHaveCount(2);
      // The folder's 3 s confirmation would fade out in the middle of the scan (axe then measures
      // half-transparent text); the screen under test is Trash, the toast has its own stories.
      await expect(page.getByText('Folder moved to Trash')).toBeHidden();
    },
  },
  {
    name: 'folder view',
    open: async (page) => {
      await openFeed(page, `/folders/${MOCK_FIXTURE.readingId}`);
      await expect(
        page.getByRole('heading', { level: 1, name: MOCK_FIXTURE.readingName }),
      ).toBeVisible();
    },
  },
  {
    name: 'search dialog',
    tag: E2E_TAG.Phone,
    open: async (page) => {
      await useSearchDialogWidth(page);
      await openFeed(page);
      await page.getByRole('button', { name: SEARCH_BUTTON }).click();
      await page
        .getByRole('combobox', { name: 'Search links, folders and tags' })
        .fill(MOCK_FIXTURE.searchWord);
      await expect(page.getByRole('option').first()).toBeVisible();
      await expect(page.getByRole('listbox')).not.toHaveAttribute('aria-busy', 'true');
    },
    ...SHEET,
  },
  {
    // From 80em (the desktop project's 1280px) the header field opens a results panel (#329).
    name: 'search panel (header field)',
    open: async (page) => {
      await openFeed(page);
      await page.getByRole('combobox', { name: SEARCH_FIELD_NAME }).fill(MOCK_FIXTURE.searchWord);
      await expect(page.getByRole('option').first()).toBeVisible();
      await expect(page.getByRole('listbox')).not.toHaveAttribute('aria-busy', 'true');
    },
    include: 'app-header-search, .ui-command-list__panel',
    only: E2E_PROJECT.Desktop,
  },
  {
    name: 'settings (You list on a phone, the account on desktop)',
    tag: E2E_TAG.Phone,
    open: async (page) => {
      await openSignedIn(page, '/settings');
      await expect(page.getByRole('heading', { level: 1, name: /^(Account|You)$/ })).toBeVisible();
    },
  },
  {
    name: 'settings account',
    open: async (page) => {
      await openSignedIn(page, '/settings/account');
      await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
      await expect(page.getByText('Sign out of Shelfmark')).toBeVisible();
      // Your shelf, connected accounts and Your data (#352).
      await expect(page.getByRole('heading', { name: 'Sites you save most' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Connected accounts' })).toBeVisible();
    },
  },
  {
    name: 'settings appearance',
    open: async (page) => {
      await openSignedIn(page, '/settings/appearance');
      await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();
    },
  },
  {
    name: 'add link dialog',
    tag: E2E_TAG.Mobile,
    open: async (page) => {
      await openFeed(page);
      await page.getByRole('button', { name: 'Add link' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await dialog.getByLabel('Link', { exact: true }).fill(DUPLICATE_URL);
      await expect(dialog.getByRole('button', { name: 'Open saved' })).toBeVisible();
    },
    ...SHEET,
  },
  {
    name: 'move link picker',
    tag: E2E_TAG.Phone,
    open: async (page) => {
      await openFeed(page);
      const picker = await openCardMove(page);
      await expect(picker.getByRole('option').first()).toBeVisible();
    },
    ...SHEET,
  },
  {
    name: 'phone library',
    tag: E2E_TAG.Phone,
    only: E2E_PROJECT.Phone,
    open: async (page) => {
      await openFeed(page);
      await openSidebar(page);
      await expect(page.locator('app-library-tile').first()).toBeVisible();
    },
  },
  {
    name: 'phone tags',
    tag: E2E_TAG.Phone,
    only: E2E_PROJECT.Phone,
    open: async (page) => {
      await openFeed(page);
      await openTags(page);
      await expect(page.locator('app-sidebar-tags ui-chip').first()).toBeVisible();
    },
  },
  {
    name: 'phone recently opened sheet',
    tag: E2E_TAG.Phone,
    only: E2E_PROJECT.Phone,
    open: async (page) => {
      await openFeed(page);
      await openSidebar(page);
      await page.getByRole('link', { name: /^Recently opened/ }).click();
      await expect(page.getByRole('dialog', { name: 'Recently opened' })).toBeVisible();
      await expect(page.locator('app-link-history-row').first()).toBeVisible();
    },
    ...SHEET,
  },
];

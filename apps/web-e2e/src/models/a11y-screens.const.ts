import { expect, type Page } from '@playwright/test';
import {
  openCardEdit,
  openEmptyFeed,
  openFeed,
  openSignedIn,
  openTagMenu,
  pickFolderMenuItem,
  pickTagMenuItem,
} from '../support/a11y-flows';
import { NEW_USER, seedSession } from '../support/mock-session';
import {
  enablePublicLink,
  openShareDialog,
  SAMPLE_SHARE,
  seedShares,
} from '../support/public-collection';
import { SEARCH_BUTTON } from '../support/search-button';
import { openSidebar, openTags } from '../support/sidebar';
import { deleteFirstLink, deleteReadingFolderWithLinks, openTrash } from '../support/trash';
import type { A11yScreen } from './a11y-screen.interface';
import { DIALOG_SELECTOR } from './dialog-selector.const';
import { E2E_PROJECT } from './e2e-project.const';
import { MOCK_FIXTURE } from './mock-fixture.const';
import { TITLED_DIALOG_SELECTOR } from './titled-dialog-selector.const';

const DUPLICATE_URL = 'https://angular.dev/overview';
// Dialogs and menus are laid out alike on a phone, so one project is enough for them; the ones
// that become a bottom sheet or have long content run on both.
const OVERLAY = { include: DIALOG_SELECTOR, only: E2E_PROJECT.Desktop } as const;
const SHEET = { include: DIALOG_SELECTOR } as const;

async function openOnboardingStep(page: Page, steps: number): Promise<void> {
  await seedSession(page, NEW_USER);
  await page.goto('/links');
  await expect(page.getByRole('dialog', { name: 'All your links in one place' })).toBeVisible();
  for (let step = 0; step < steps; step++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  // The step content slides in; the running illustration loops forever and is skipped by `settled`.
}

/** Every app screen the accessibility pass scans, in both themes and on both projects. */
export const A11Y_SCREENS: readonly A11yScreen[] = [
  {
    name: 'sign-in',
    open: async (page) => {
      await page.goto('/sign-in');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    },
  },
  { name: 'feed, cards', open: (page) => openFeed(page) },
  {
    name: 'feed, list',
    open: async (page) => {
      await openFeed(page);
      await page.getByRole('radio', { name: 'List' }).click();
      await expect(page.locator('ui-list-item').first()).toBeVisible();
    },
  },
  {
    name: 'recently opened',
    open: async (page) => {
      await openSignedIn(page, '/recent');
      await expect(page.locator('app-link-history-row').first()).toBeVisible();
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
    name: 'empty trash',
    open: async (page) => {
      await openFeed(page);
      await openTrash(page);
      await expect(page.getByRole('heading', { name: 'Trash is empty' })).toBeVisible();
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
    name: 'folder not found',
    open: async (page) => {
      await openSignedIn(page, '/folders/does-not-exist');
      await expect(page.getByRole('heading', { name: 'Folder not found' })).toBeVisible();
    },
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
  },
  { name: 'empty feed', open: (page) => openEmptyFeed(page) },
  {
    name: 'tag filter',
    open: async (page) => {
      await openFeed(page, `/links?tag=${MOCK_FIXTURE.tagDocs}`);
      await expect(page.getByRole('group', { name: 'Active filters' })).toBeVisible();
    },
  },
  {
    name: 'search, nothing found',
    open: async (page) => {
      await openSignedIn(page, '/links?q=zzzzqq');
      await expect(page.getByRole('heading', { name: 'Nothing found for “zzzzqq”' })).toBeVisible();
    },
  },
  {
    name: 'search dialog',
    open: async (page) => {
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
    name: 'settings (You list on a phone, the account on desktop)',
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
      await expect(page.getByText('See the 3-step introduction again')).toBeVisible();
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
    name: 'settings library',
    open: async (page) => {
      await openSignedIn(page, '/settings/library');
      await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
      await expect(page.getByRole('radio', { name: '30 days' })).toBeChecked();
    },
  },
  {
    name: 'settings export',
    open: async (page) => {
      await openSignedIn(page, '/settings/import-export');
      await expect(page.getByRole('heading', { level: 1, name: 'Export' })).toBeVisible();
      await expect(page.getByText('Export your data')).toBeVisible();
    },
  },
  {
    name: 'settings privacy and data',
    open: async (page) => {
      await openSignedIn(page, '/settings/privacy');
      await expect(page.getByRole('heading', { level: 1, name: 'Privacy and data' })).toBeVisible();
    },
  },
  {
    name: 'settings keyboard shortcuts',
    open: async (page) => {
      await openSignedIn(page, '/settings/shortcuts');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Keyboard shortcuts' }),
      ).toBeVisible();
    },
  },
  {
    name: 'keyboard shortcuts dialog',
    open: async (page) => {
      await openFeed(page);
      await page.keyboard.press('?');
      await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    },
    ...SHEET,
  },
  {
    name: 'export menu',
    open: async (page) => {
      await openFeed(page);
      await page.getByRole('button', { name: 'Export' }).click();
      await expect(page.getByRole('menuitem', { name: 'Everything as JSON' })).toBeVisible();
    },
    only: E2E_PROJECT.Desktop,
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
    ...SHEET,
  },
  {
    name: 'add link dialog, new tag',
    open: async (page) => {
      await openFeed(page);
      await page.getByRole('button', { name: 'Add link' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      const input = dialog.getByRole('combobox', { name: 'Tags' });
      await input.fill('brand new');
      await expect(page.getByRole('option', { name: /Create tag .brand new./ })).toBeVisible();
      await input.press('Enter');
      await expect(dialog.getByText('brand-new', { exact: true })).toBeVisible();
    },
    ...OVERLAY,
  },
  {
    name: 'paste many list',
    open: async (page) => {
      await openFeed(page);
      await page.getByRole('button', { name: 'Add link' }).first().click();
      const field = page
        .getByRole('dialog', { name: 'Add link' })
        .getByLabel('Link', { exact: true });
      await field.focus();
      // String script: this project has no DOM lib. A paste with two links and a note.
      await page.evaluate(
        `(() => {
          const data = new DataTransfer();
          data.setData('text/plain', 'https://example.org/a\\n${DUPLICATE_URL}\\nremember the RFC');
          document.activeElement.dispatchEvent(
            new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
          );
        })()`,
      );
      const dialog = page.getByRole('dialog', { name: 'Add 1 link' });
      await expect(dialog.getByText('Already saved')).toBeVisible();
      await expect(dialog.getByText('Not a link, skipped')).toBeVisible();
    },
    ...SHEET,
  },
  {
    name: 'edit link dialog',
    open: async (page) => {
      await openFeed(page);
      await openCardEdit(page);
    },
    ...SHEET,
  },
  {
    name: 'delete link confirmation',
    open: async (page) => {
      await openFeed(page);
      const edit = await openCardEdit(page);
      await edit.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
    },
    ...OVERLAY,
  },
  {
    name: 'new folder dialog',
    open: async (page) => {
      await openFeed(page);
      await openSidebar(page);
      await page.getByRole('button', { name: 'New folder' }).click();
      await expect(page.getByRole('dialog', { name: 'New folder' })).toBeVisible();
    },
    ...OVERLAY,
  },
  {
    name: 'move folder dialog',
    open: async (page) => {
      await openFeed(page);
      await pickFolderMenuItem(page, MOCK_FIXTURE.readingName, 'Move to…');
      await expect(
        page.getByRole('dialog', { name: `Move “${MOCK_FIXTURE.readingName}”` }),
      ).toBeVisible();
    },
    ...OVERLAY,
  },
  {
    name: 'folder colour and icon dialog',
    open: async (page) => {
      await openFeed(page);
      await pickFolderMenuItem(page, MOCK_FIXTURE.readingName, 'Colour and icon…');
      await expect(
        page.getByRole('dialog', { name: MOCK_FIXTURE.readingName }).getByRole('radiogroup'),
      ).toHaveCount(2);
    },
    include: TITLED_DIALOG_SELECTOR,
    // Both projects: the dialog is a sheet on a phone.
  },
  {
    name: 'sidebar with pinned items',
    open: async (page) => {
      await openFeed(page);
      await pickFolderMenuItem(page, MOCK_FIXTURE.readingName, 'Pin to sidebar');
      await expect(page.getByRole('heading', { name: 'Pinned' })).toBeVisible();
    },
  },
  {
    name: 'delete folder dialog',
    open: async (page) => {
      await openFeed(page);
      await pickFolderMenuItem(page, MOCK_FIXTURE.readingName, 'Delete folder…');
      await expect(page.getByRole('dialog', { name: /^Delete folder/ })).toBeVisible();
    },
    include: TITLED_DIALOG_SELECTOR,
    // Both projects: the confirmation is a sheet on a phone.
  },
  {
    name: 'share folder dialog with the public link on',
    open: async (page) => {
      await openFeed(page);
      await enablePublicLink(await openShareDialog(page, MOCK_FIXTURE.readingName));
    },
    // Both projects: a sheet on a phone, with the link field above the button.
    ...SHEET,
  },
  {
    name: 'public collection (guest)',
    open: async (page) => {
      await seedShares(page, JSON.stringify([SAMPLE_SHARE]));
      await page.goto(`/c/${SAMPLE_SHARE.token}`);
      await expect(page.locator('ui-card').first()).toBeVisible();
    },
  },
  {
    name: 'public collection not found',
    open: async (page) => {
      await page.goto(`/c/${SAMPLE_SHARE.token}`);
      await expect(
        page.getByRole('heading', { level: 1, name: "This collection isn't available" }),
      ).toBeVisible();
    },
  },
  {
    name: 'tag menu',
    open: async (page) => {
      await openFeed(page);
      await openTagMenu(page, MOCK_FIXTURE.tagDocs);
      await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    },
    include: '[role="menu"]',
    only: E2E_PROJECT.Desktop,
  },
  {
    name: 'tag, new tag field',
    open: async (page) => {
      await openFeed(page);
      await openTags(page);
      const tags = page.locator('app-sidebar-tags');
      await tags.getByRole('button', { name: 'New tag' }).click();
      await expect(tags.getByRole('textbox', { name: 'New tag' })).toBeFocused();
    },
    include: 'app-sidebar-tags',
    // Both projects: on a phone the field lives on the Tags tab.
  },
  {
    name: 'merge tag dialog',
    open: async (page) => {
      await openFeed(page);
      await pickTagMenuItem(page, MOCK_FIXTURE.tagDocs, 'Merge into another tag…');
      await expect(page.getByRole('dialog', { name: /Merge/ })).toBeVisible();
    },
    ...OVERLAY,
  },
  {
    name: 'delete tag confirmation',
    open: async (page) => {
      await openFeed(page);
      await pickTagMenuItem(page, MOCK_FIXTURE.tagDocs, 'Delete tag');
      await expect(page.getByRole('alertdialog')).toBeVisible();
    },
    ...OVERLAY,
  },
  {
    name: 'onboarding dialog, step 1',
    open: (page) => openOnboardingStep(page, 0),
    ...SHEET,
  },
  {
    name: 'onboarding dialog, step 2',
    open: async (page) => {
      await openOnboardingStep(page, 1);
      await expect(page.getByRole('dialog', { name: 'Save in a second' })).toBeVisible();
    },
    ...SHEET,
  },
  {
    name: 'onboarding dialog, step 3',
    open: async (page) => {
      await openOnboardingStep(page, 2);
      await expect(page.getByRole('dialog', { name: 'Find it right away' })).toBeVisible();
    },
    ...SHEET,
  },
  {
    name: 'phone library',
    only: E2E_PROJECT.Phone,
    open: async (page) => {
      await openFeed(page);
      await openSidebar(page);
      await expect(page.locator('app-library-tile').first()).toBeVisible();
    },
  },
  {
    name: 'phone tags',
    only: E2E_PROJECT.Phone,
    open: async (page) => {
      await openFeed(page);
      await openTags(page);
      await expect(page.locator('app-sidebar-tags ui-chip').first()).toBeVisible();
    },
  },
  {
    name: 'phone recently opened sheet',
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

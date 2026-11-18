import { CHANGELOG_ITEM_KIND } from './changelog-item-kind.const';
import type { ChangelogRelease } from './changelog-release.interface';

/**
 * Every release, newest first (#424). The release PR `stage → main` sets the date of the entry
 * at the top (until then it is a hidden draft) and the matching `package.json` version; a hotfix
 * into `main` adds a patch entry with one-line fixes. Media rules (PROJECT.md 9.3): improvements
 * and fixes are one line of text; features get a short text and, when they have a `priority`, a
 * screenshot per theme (`public/media/whats-new/<version>/`, made by the generator, no video).
 * The draft lists the 2.1.0 changes since 2.0.0; hotfixes 2.0.1 to 2.0.8 are not repeated.
 */
export const CHANGELOG: readonly ChangelogRelease[] = [
  {
    version: '2.1.1',
    date: '2026-11-18',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'extensionInStore',
        textKey: 'changelog.items.extensionInStore.text',
      },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-11-17',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'sideBySide',
        titleKey: 'changelog.items.sideBySide.title',
        textKey: 'changelog.items.sideBySide.text',
        priority: 1,
        image: {
          light: '/media/whats-new/2.1.0/side-by-side-light.webp',
          dark: '/media/whats-new/2.1.0/side-by-side-dark.webp',
          width: 2000,
          height: 1250,
          altKey: 'changelog.items.sideBySide.alt',
        },
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'folderStyle',
        titleKey: 'changelog.items.folderStyle.title',
        textKey: 'changelog.items.folderStyle.text',
        priority: 2,
        image: {
          light: '/media/whats-new/2.1.0/folder-styling-light.webp',
          dark: '/media/whats-new/2.1.0/folder-styling-dark.webp',
          width: 2000,
          height: 1250,
          altKey: 'changelog.items.folderStyle.alt',
        },
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'domainRules',
        titleKey: 'changelog.items.domainRules.title',
        textKey: 'changelog.items.domainRules.text',
        priority: 3,
        image: {
          light: '/media/whats-new/2.1.0/rules-by-domain-light.webp',
          dark: '/media/whats-new/2.1.0/rules-by-domain-dark.webp',
          width: 2000,
          height: 1250,
          altKey: 'changelog.items.domainRules.alt',
        },
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'reminders',
        titleKey: 'changelog.items.reminders.title',
        textKey: 'changelog.items.reminders.text',
        priority: 4,
        image: {
          light: '/media/whats-new/2.1.0/reminders-light.webp',
          dark: '/media/whats-new/2.1.0/reminders-dark.webp',
          width: 2000,
          height: 1250,
          altKey: 'changelog.items.reminders.alt',
        },
      },
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'folderChips',
        textKey: 'changelog.items.folderChips.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'updatePrompt',
        textKey: 'changelog.items.updatePrompt.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'whatsNewCard',
        textKey: 'changelog.items.whatsNewCard.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'privacyWording',
        textKey: 'changelog.items.privacyWording.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'toastWraps',
        textKey: 'changelog.items.toastWraps.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'folderStyleRace',
        textKey: 'changelog.items.folderStyleRace.text',
      },
    ],
  },
  {
    version: '2.0.8',
    date: '2026-11-17',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'newFolderInAddLink',
        textKey: 'changelog.items.newFolderInAddLink.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'emojiPickerTabs',
        textKey: 'changelog.items.emojiPickerTabs.text',
      },
    ],
  },
  {
    version: '2.0.7',
    date: '2026-11-16',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'sheetDropdown',
        textKey: 'changelog.items.sheetDropdown.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'skeletonRows',
        textKey: 'changelog.items.skeletonRows.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'feedbackActive',
        textKey: 'changelog.items.feedbackActive.text',
      },
    ],
  },
  {
    version: '2.0.6',
    date: '2026-11-16',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'fastLanding',
        textKey: 'changelog.items.fastLanding.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'phoneKeyboard',
        textKey: 'changelog.items.phoneKeyboard.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'emptyExport',
        textKey: 'changelog.items.emptyExport.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'bulkBar',
        textKey: 'changelog.items.bulkBar.text',
      },
    ],
  },
  {
    version: '2.0.5',
    date: '2026-11-14',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'colourPicker',
        textKey: 'changelog.items.colourPicker.text',
      },
    ],
  },
  {
    version: '2.0.4',
    date: '2026-11-14',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'phoneSignIn',
        textKey: 'changelog.items.phoneSignIn.text',
      },
    ],
  },
  {
    version: '2.0.3',
    date: '2026-11-14',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'appSkeleton',
        textKey: 'changelog.items.appSkeleton.text',
      },
    ],
  },
  {
    version: '2.0.2',
    date: '2026-11-14',
    items: [
      { kind: CHANGELOG_ITEM_KIND.Fix, id: 'ukrainian', textKey: 'changelog.items.ukrainian.text' },
    ],
  },
  {
    version: '2.0.1',
    date: '2026-11-14',
    items: [
      { kind: CHANGELOG_ITEM_KIND.Fix, id: 'noHttps', textKey: 'changelog.items.noHttps.text' },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-11-14',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'refresh',
        titleKey: 'changelog.items.refresh.title',
        textKey: 'changelog.items.refresh.text',
        priority: 1,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'trash',
        titleKey: 'changelog.items.trash.title',
        textKey: 'changelog.items.trash.text',
        priority: 2,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'folders',
        titleKey: 'changelog.items.folders.title',
        textKey: 'changelog.items.folders.text',
        priority: 3,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'savedViews',
        titleKey: 'changelog.items.savedViews.title',
        textKey: 'changelog.items.savedViews.text',
        priority: 4,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'sharing',
        titleKey: 'changelog.items.sharing.title',
        textKey: 'changelog.items.sharing.text',
        priority: 5,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'pasteMany',
        titleKey: 'changelog.items.pasteMany.title',
        textKey: 'changelog.items.pasteMany.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'bulk',
        titleKey: 'changelog.items.bulk.title',
        textKey: 'changelog.items.bulk.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'dragDrop',
        titleKey: 'changelog.items.dragDrop.title',
        textKey: 'changelog.items.dragDrop.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'theme',
        titleKey: 'changelog.items.theme.title',
        textKey: 'changelog.items.theme.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'languages',
        titleKey: 'changelog.items.languages.title',
        textKey: 'changelog.items.languages.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'feedback',
        titleKey: 'changelog.items.feedback.title',
        textKey: 'changelog.items.feedback.text',
      },
    ],
  },
];

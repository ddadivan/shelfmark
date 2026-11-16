import { CHANGELOG_ITEM_KIND } from './changelog-item-kind.const';
import type { ChangelogRelease } from './changelog-release.interface';

/**
 * Every release, newest first (#424). The release PR `stage → main` sets the date of the entry
 * at the top (until then it is a hidden draft) and the matching `package.json` version; a hotfix
 * into `main` adds a patch entry with one-line fixes. Media rules (PROJECT.md 9.3): fixes are text
 * only; highlighted features get a short text and an image (`public/media/whats-new/`), at most one
 * short silent loop per release. The 2.1.0 media come with the release.
 */
export const CHANGELOG: readonly ChangelogRelease[] = [
  {
    version: '2.1.0',
    date: null,
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'sideBySide',
        titleKey: 'changelog.items.sideBySide.title',
        textKey: 'changelog.items.sideBySide.text',
        highlight: true,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'folderStyle',
        titleKey: 'changelog.items.folderStyle.title',
        textKey: 'changelog.items.folderStyle.text',
        highlight: true,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'domainRules',
        titleKey: 'changelog.items.domainRules.title',
        textKey: 'changelog.items.domainRules.text',
        highlight: true,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'reminders',
        titleKey: 'changelog.items.reminders.title',
        textKey: 'changelog.items.reminders.text',
        highlight: true,
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
        highlight: true,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'trash',
        titleKey: 'changelog.items.trash.title',
        textKey: 'changelog.items.trash.text',
        highlight: true,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'folders',
        titleKey: 'changelog.items.folders.title',
        textKey: 'changelog.items.folders.text',
        highlight: true,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'savedViews',
        titleKey: 'changelog.items.savedViews.title',
        textKey: 'changelog.items.savedViews.text',
        highlight: true,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'sharing',
        titleKey: 'changelog.items.sharing.title',
        textKey: 'changelog.items.sharing.text',
        highlight: true,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'pasteMany',
        titleKey: 'changelog.items.pasteMany.title',
        textKey: 'changelog.items.pasteMany.text',
        highlight: false,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'bulk',
        titleKey: 'changelog.items.bulk.title',
        textKey: 'changelog.items.bulk.text',
        highlight: false,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'dragDrop',
        titleKey: 'changelog.items.dragDrop.title',
        textKey: 'changelog.items.dragDrop.text',
        highlight: false,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'theme',
        titleKey: 'changelog.items.theme.title',
        textKey: 'changelog.items.theme.text',
        highlight: false,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'languages',
        titleKey: 'changelog.items.languages.title',
        textKey: 'changelog.items.languages.text',
        highlight: false,
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'feedback',
        titleKey: 'changelog.items.feedback.title',
        textKey: 'changelog.items.feedback.text',
        highlight: false,
      },
    ],
  },
];

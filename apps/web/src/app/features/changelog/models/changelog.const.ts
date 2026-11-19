import { CHANGELOG_ITEM_KIND } from './changelog-item-kind.const';
import type { ChangelogRelease } from './changelog-release.interface';

/**
 * Every release, newest first (#424). The release PR `stage → main` sets the date of the entry
 * at the top (until then it is a hidden draft) and the matching `package.json` version; a hotfix
 * into `main` adds a patch entry with one-line fixes. Media rules (PROJECT.md 9.3): improvements
 * and fixes are one line of text; features get a short text and, when they have a `priority`, a
 * screenshot per theme (`public/media/whats-new/<version>/`, made by the generator, no video).
 * The 2.3.0 entry makes Ask a chat; the 2.2.0 entry lists the AI release; the 2.1.0 entry lists the changes since 2.0.0; hotfixes 2.0.1 to 2.0.8 are not repeated.
 */
export const CHANGELOG: readonly ChangelogRelease[] = [
  {
    version: '2.3.1',
    date: '2026-11-19',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'askNoSideways',
        textKey: 'changelog.items.askNoSideways.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'askScrollsDown',
        textKey: 'changelog.items.askScrollsDown.text',
      },
    ],
  },
  {
    version: '2.3.0',
    date: '2026-11-19',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'askChat',
        titleKey: 'changelog.items.askChat.title',
        textKey: 'changelog.items.askChat.text',
        priority: 1,
        image: {
          light: '/media/whats-new/2.3.0/ask-chat-light.webp',
          dark: '/media/whats-new/2.3.0/ask-chat-dark.webp',
          width: 2000,
          height: 1250,
          altKey: 'changelog.items.askChat.alt',
        },
      },
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'toastsSmooth',
        textKey: 'changelog.items.toastsSmooth.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'cardTagsFit',
        textKey: 'changelog.items.cardTagsFit.text',
      },
    ],
  },
  {
    version: '2.2.2',
    date: '2026-11-19',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'aiNewTags',
        textKey: 'changelog.items.aiNewTags.text',
      },
    ],
  },
  {
    version: '2.2.1',
    date: '2026-11-19',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'askAnswers',
        textKey: 'changelog.items.askAnswers.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'youtubeTitles',
        textKey: 'changelog.items.youtubeTitles.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'clearedSummary',
        textKey: 'changelog.items.clearedSummary.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'cardTagsWhole',
        textKey: 'changelog.items.cardTagsWhole.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'bulkBarFits',
        textKey: 'changelog.items.bulkBarFits.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'aiDialogIcon',
        textKey: 'changelog.items.aiDialogIcon.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'searchChoice',
        textKey: 'changelog.items.searchChoice.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'backfillProgress',
        textKey: 'changelog.items.backfillProgress.text',
      },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-11-19',
    items: [
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'aiSuggestions',
        titleKey: 'changelog.items.aiSuggestions.title',
        textKey: 'changelog.items.aiSuggestions.text',
        priority: 1,
        image: {
          light: '/media/whats-new/2.2.0/ai-suggestions-light.webp',
          dark: '/media/whats-new/2.2.0/ai-suggestions-dark.webp',
          width: 2000,
          height: 1250,
          altKey: 'changelog.items.aiSuggestions.alt',
        },
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'aiAsk',
        titleKey: 'changelog.items.aiAsk.title',
        textKey: 'changelog.items.aiAsk.text',
        priority: 2,
        image: {
          light: '/media/whats-new/2.2.0/ai-ask-light.webp',
          dark: '/media/whats-new/2.2.0/ai-ask-dark.webp',
          width: 2000,
          height: 1250,
          altKey: 'changelog.items.aiAsk.alt',
        },
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'aiSearch',
        titleKey: 'changelog.items.aiSearch.title',
        textKey: 'changelog.items.aiSearch.text',
        priority: 3,
        image: {
          light: '/media/whats-new/2.2.0/ai-search-light.webp',
          dark: '/media/whats-new/2.2.0/ai-search-dark.webp',
          width: 2000,
          height: 1250,
          altKey: 'changelog.items.aiSearch.alt',
        },
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'aiSummaries',
        titleKey: 'changelog.items.aiSummaries.title',
        textKey: 'changelog.items.aiSummaries.text',
        priority: 4,
        image: {
          light: '/media/whats-new/2.2.0/ai-summaries-light.webp',
          dark: '/media/whats-new/2.2.0/ai-summaries-dark.webp',
          width: 2000,
          height: 1250,
          altKey: 'changelog.items.aiSummaries.alt',
        },
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'aiTidy',
        titleKey: 'changelog.items.aiTidy.title',
        textKey: 'changelog.items.aiTidy.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'mcp',
        titleKey: 'changelog.items.mcp.title',
        textKey: 'changelog.items.mcp.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'aiCleanup',
        titleKey: 'changelog.items.aiCleanup.title',
        textKey: 'changelog.items.aiCleanup.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Feature,
        id: 'forgotten',
        titleKey: 'changelog.items.forgotten.title',
        textKey: 'changelog.items.forgotten.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'cardTags',
        textKey: 'changelog.items.cardTags.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'phoneFolders',
        textKey: 'changelog.items.phoneFolders.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Improvement,
        id: 'dialogButtons',
        textKey: 'changelog.items.dialogButtons.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'textFields',
        textKey: 'changelog.items.textFields.text',
      },
      {
        kind: CHANGELOG_ITEM_KIND.Fix,
        id: 'landingHeadline',
        textKey: 'changelog.items.landingHeadline.text',
      },
    ],
  },
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

import { ADMIN_STATS_FEATURE, type AdminStatsFeature } from '@shelfmark/contracts';

/** Translation key of each feature row on the stats page. */
export const ADMIN_STATS_FEATURE_LABEL: Readonly<Record<AdminStatsFeature, string>> = {
  [ADMIN_STATS_FEATURE.Folders]: 'admin.stats.feature.folders',
  [ADMIN_STATS_FEATURE.NestedFolders]: 'admin.stats.feature.nestedFolders',
  [ADMIN_STATS_FEATURE.Tags]: 'admin.stats.feature.tags',
  [ADMIN_STATS_FEATURE.Favorites]: 'admin.stats.feature.favorites',
  [ADMIN_STATS_FEATURE.Notes]: 'admin.stats.feature.notes',
  [ADMIN_STATS_FEATURE.SidebarPins]: 'admin.stats.feature.sidebarPins',
  [ADMIN_STATS_FEATURE.FolderPins]: 'admin.stats.feature.folderPins',
  [ADMIN_STATS_FEATURE.SavedViews]: 'admin.stats.feature.savedViews',
  [ADMIN_STATS_FEATURE.Trash]: 'admin.stats.feature.trash',
  [ADMIN_STATS_FEATURE.PublicCollections]: 'admin.stats.feature.publicCollections',
  [ADMIN_STATS_FEATURE.OwnColours]: 'admin.stats.feature.ownColours',
  [ADMIN_STATS_FEATURE.OwnEmoji]: 'admin.stats.feature.ownEmoji',
  [ADMIN_STATS_FEATURE.OpenedRecently]: 'admin.stats.feature.openedRecently',
  [ADMIN_STATS_FEATURE.HistoryPaused]: 'admin.stats.feature.historyPaused',
  [ADMIN_STATS_FEATURE.PreviewsOff]: 'admin.stats.feature.previewsOff',
};

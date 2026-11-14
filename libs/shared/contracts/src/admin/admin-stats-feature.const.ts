/**
 * The features whose adoption the admin usage stats count, in page order: "real users with at
 * least one ..." (live rows only; settings for the last three).
 */
export const ADMIN_STATS_FEATURE = {
  Folders: 'folders',
  NestedFolders: 'nested-folders',
  Tags: 'tags',
  Favorites: 'favorites',
  Notes: 'notes',
  SidebarPins: 'sidebar-pins',
  FolderPins: 'folder-pins',
  SavedViews: 'saved-views',
  Trash: 'trash',
  PublicCollections: 'public-collections',
  OwnColours: 'own-colours',
  OwnEmoji: 'own-emoji',
  OpenedRecently: 'opened-recently',
  HistoryPaused: 'history-paused',
  PreviewsOff: 'previews-off',
} as const;

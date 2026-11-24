/**
 * The illustration scenes: the eight of `docs/design/assets/illustrations/` and the empty-state
 * scenes of #315 (Trash, Recently opened, Favorites, Unsorted, Tags, filters) drawn in the same style,
 * and the Shelf system scenes (14-system): `error` (a load failed), `signed-out` (the session ended)
 * and `all-done` (nothing waiting, the demo ended).
 */
export const ILLUSTRATION_NAMES = [
  'welcome-collect',
  'welcome-save',
  'welcome-find',
  'empty-feed',
  'empty-folder',
  'not-found',
  'page-not-found',
  'offline',
  'empty-trash',
  'empty-recent',
  'empty-favorites',
  'empty-unsorted',
  'empty-tags',
  'empty-filter',
  'error',
  'signed-out',
  'all-done',
] as const;

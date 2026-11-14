/** The buttons of the bulk bar in the feed (#267); the ids `ui-bulk-bar` emits. */
export const BULK_ACTION = {
  /** "Move to <folder>": the folder of the right half of the side-by-side view. */
  MoveToSplit: 'move-to-split',
  Move: 'move',
  Tags: 'tags',
  Favorite: 'favorite',
  OpenAll: 'open-all',
  Copy: 'copy',
  Share: 'share',
  Delete: 'delete',
} as const;

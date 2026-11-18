/**
 * Why the kept copy of a duplicate group was chosen, in rule order: in a folder (over Unsorted), has
 * a note, has a future reminder, more tags, favourite, most recently opened, oldest.
 */
export const KEEP_REASON = {
  InFolder: 'in-folder',
  HasNote: 'has-note',
  HasReminder: 'has-reminder',
  MoreTags: 'more-tags',
  Favorite: 'favorite',
  RecentlyOpened: 'recently-opened',
  Oldest: 'oldest',
} as const;

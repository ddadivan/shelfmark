/**
 * Translation key prefix of the empty state of a filtered feed (each has `title`, `text` and
 * `clear`): an active saved view, tags only, or other filters (a link type, with or without tags).
 */
export const FILTERED_EMPTY_KEY = {
  View: 'library.emptyView',
  Tags: 'library.emptyFiltered',
  Filters: 'library.emptyFilters',
} as const;

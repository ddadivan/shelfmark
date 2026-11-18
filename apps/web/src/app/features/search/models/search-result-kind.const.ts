/** What a row of the search dialog opens; the prefix of its value (`link:<id>`). */
export const SEARCH_RESULT_KIND = {
  Link: 'link',
  Folder: 'folder',
  Tag: 'tag',
  All: 'all',
  /** A link found by meaning (AI-3), opened like a link. */
  Meaning: 'meaning',
} as const;

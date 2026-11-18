/**
 * What a suggestion proposes (#390): one of the user's existing tags, at most one new tag (marked
 * "New"), or one of the user's existing folders.
 */
export const SUGGESTION_KIND = {
  Tag: 'tag',
  NewTag: 'new-tag',
  Folder: 'folder',
} as const;

/** What Automatic mode applied to a link and can still be undone (the "Moved by AI" marks). */
export interface AiAutoApplied {
  /** The folder AI moved the link to; `null` when the folder was not auto-applied. */
  folderId: string | null;
  /** Tag names AI added; empty when none. */
  tags: string[];
}

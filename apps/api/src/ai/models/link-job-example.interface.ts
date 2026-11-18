/**
 * One earlier choice of the user for the same site (AI-2, ADR 0050): only a folder key of the
 * prompt's vocabulary (or `null`) and the user's own tag names; never a title, URL or note.
 */
export interface LinkJobExample {
  folderKey: string | null;
  tags: readonly string[];
}

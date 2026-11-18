/** How to revert one tag merge (held in `cleanup_reports.undo_data`). */
export interface StoredUndoMerge {
  /** The tag that was kept. */
  keptTagId: string;
  /** Name of the merged (removed) tag, re-created or reused by Undo. */
  mergedName: string;
  /** Links that carried the merged tag. */
  linkIds: string[];
  /** Links that got the kept tag only through the merge. */
  addedLinkIds: string[];
}

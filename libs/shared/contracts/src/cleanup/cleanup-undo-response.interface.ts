/** `POST /api/cleanup/undo` answer. */
export interface CleanupUndoResponse {
  /** Links restored from Trash. */
  restored: number;
  /** Merges reverted. */
  unmerged: number;
}

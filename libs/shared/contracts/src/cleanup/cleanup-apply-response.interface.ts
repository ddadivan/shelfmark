import type { CleanupUndoRequest } from './cleanup-undo-request.interface';

/** `POST /api/cleanup/apply` answer. */
export interface CleanupApplyResponse {
  /** Links moved to Trash. */
  trashed: number;
  /** Tag pairs merged. */
  merged: number;
  /** Selected items left alone (no longer in the report, gone, or would trash every member). */
  skipped: number;
  /** The links moved to Trash (to take them out of the feed). */
  trashedIds: string[];
  /**
   * Send back unchanged to `POST /api/cleanup/undo` to revert the whole run; `null` when nothing
   * changed.
   */
  undo: CleanupUndoRequest | null;
}

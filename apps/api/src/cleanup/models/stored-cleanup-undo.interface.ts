import type { StoredUndoMerge } from './stored-undo-merge.interface';

/** What Undo reverts, held in `cleanup_reports.undo_data` (ids and merged tag names only). */
export interface StoredCleanupUndo {
  /** The shared Trash time of the run; `null` when nothing was trashed. */
  deletedAt: string | null;
  trashedIds: string[];
  merges: StoredUndoMerge[];
}

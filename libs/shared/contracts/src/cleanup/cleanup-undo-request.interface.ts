import type { CleanupUndoMerge } from './cleanup-undo-merge.interface';

/** `POST /api/cleanup/undo` body: the `undo` payload of the apply response, unchanged. */
export interface CleanupUndoRequest {
  /** The shared Trash time of the run; `null` when nothing was trashed. */
  deletedAt: string | null;
  trashedIds: string[];
  merges: CleanupUndoMerge[];
}

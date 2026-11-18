import type { MockUndoMerge } from './mock-undo-merge.interface';

/** The Undo the mock holds for the latest apply (like `cleanup_reports.undo_data`), single-use. */
export interface MockCleanupUndo {
  runId: string;
  /** Epoch ms after which Undo is refused. */
  until: number;
  /** The shared Trash time of the run; `null` when nothing was trashed. */
  deletedAt: string | null;
  trashedIds: string[];
  merges: MockUndoMerge[];
}

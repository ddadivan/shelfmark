/**
 * `POST /api/cleanup/undo` body: the `undo` of the apply response, unchanged. Only the run id: the
 * server holds what to revert (single-use, valid for `CLEANUP_LIMIT.UndoWindowMinutes` and until
 * the next apply that changes something).
 */
export interface CleanupUndoRequest {
  runId: string;
}

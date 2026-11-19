import type { ImportRunPhase } from './import-run-phase.type';

/** Progress and result of the current import run. */
export interface ImportRunState {
  readonly phase: ImportRunPhase;
  readonly importId: string | null;
  /** Links planned for this run. */
  readonly total: number;
  /** Links handled so far (created, replayed or failed). */
  readonly processed: number;
  readonly created: number;
  readonly failed: number;
  /** Left out before sending (duplicates, non-web) plus items the API skipped. */
  readonly skipped: number;
  readonly folders: number;
  readonly targetFolderId: string | null;
  /** Name of the target folder for the summary; `null` for Unsorted. */
  readonly targetName: string | null;
  /** Message key when the run stopped before anything was written. */
  readonly errorKey: string | null;
}

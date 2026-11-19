import { IMPORT_RUN_PHASE } from './import-run-phase.const';
import type { ImportRunState } from './import-run-state.interface';

/** The run state before anything started. */
export const IMPORT_RUN_IDLE: ImportRunState = {
  phase: IMPORT_RUN_PHASE.Idle,
  importId: null,
  total: 0,
  processed: 0,
  created: 0,
  failed: 0,
  skipped: 0,
  folders: 0,
  targetFolderId: null,
  targetName: null,
  errorKey: null,
};

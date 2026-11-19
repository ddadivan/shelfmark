import type { IMPORT_RUN_PHASE } from './import-run-phase.const';

export type ImportRunPhase = (typeof IMPORT_RUN_PHASE)[keyof typeof IMPORT_RUN_PHASE];

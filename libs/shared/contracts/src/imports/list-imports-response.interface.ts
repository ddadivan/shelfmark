import type { ImportSummary } from './import-summary.interface';

/** `GET /api/imports`: the user's imports of the last `IMPORT_LIMIT.UndoDays` days not undone, newest first. */
export interface ListImportsResponse {
  items: ImportSummary[];
}

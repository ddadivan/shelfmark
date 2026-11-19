import { IMPORT_LIMIT } from '@shelfmark/contracts';
import type { ImportOpenRow } from './models/import-open-row.interface';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** True while the import still takes batches: not undone and started within `OpenHours`. */
export function isImportOpen(row: ImportOpenRow, now: Date): boolean {
  return (
    row.undoneAt === null &&
    now.getTime() - row.createdAt.getTime() <= IMPORT_LIMIT.OpenHours * HOUR_MS
  );
}

/** True while the import can be undone (and is listed): not undone and started within `UndoDays`. */
export function isImportUndoable(row: ImportOpenRow, now: Date): boolean {
  return (
    row.undoneAt === null &&
    now.getTime() - row.createdAt.getTime() <= IMPORT_LIMIT.UndoDays * DAY_MS
  );
}

/** The oldest start time still listed and undoable at `now`. */
export function undoCutoff(now: Date): Date {
  return new Date(now.getTime() - IMPORT_LIMIT.UndoDays * DAY_MS);
}

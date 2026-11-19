import { IMPORT_EARLIEST_ADDED_AT } from './models/import-earliest-added-at.const';

/**
 * The save date to store for a bookmark's `addedAt`: never in the future (then `now`), and `undefined`
 * (= keep the batch's own ordering) when it is missing, unreadable or before 1990-01-01.
 */
export function clampAddedAt(addedAt: string | undefined, now: Date): Date | undefined {
  if (addedAt === undefined) return undefined;
  const time = Date.parse(addedAt);
  if (Number.isNaN(time) || time < IMPORT_EARLIEST_ADDED_AT.getTime()) return undefined;
  return new Date(Math.min(time, now.getTime()));
}

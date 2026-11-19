/** Earliest date added that is kept (older values are clock or format errors). */
const EARLIEST_MS = Date.UTC(1990, 0, 1);

/**
 * `ADD_DATE` of a bookmark file as an ISO time: seconds since 1970 (Chrome, Firefox, Edge); some
 * tools write milliseconds or microseconds, recognised by their size. Anything that is not a
 * plain number, before 1990 or after `now` is `undefined`.
 */
export function bookmarkDate(value: string | null, now: number = Date.now()): string | undefined {
  if (value === null || !/^\d{1,20}$/.test(value.trim())) {
    return undefined;
  }
  const raw = Number(value.trim());
  const ms = raw > 1e14 ? raw / 1000 : raw > 1e11 ? raw : raw * 1000;
  if (!Number.isFinite(ms) || ms < EARLIEST_MS || ms > now) {
    return undefined;
  }
  return new Date(Math.floor(ms)).toISOString();
}

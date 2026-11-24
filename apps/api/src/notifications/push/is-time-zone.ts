import { NOTIFICATION_LIMIT } from '@shelfmark/contracts';

const TIME_ZONE_SHAPE = /^[A-Za-z][A-Za-z0-9_+\-/]*$/;

/** True for an IANA time zone name this runtime knows (`Europe/Berlin`, `UTC`). */
export function isTimeZone(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length > NOTIFICATION_LIMIT.TimeZoneMax ||
    !TIME_ZONE_SHAPE.test(value)
  ) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

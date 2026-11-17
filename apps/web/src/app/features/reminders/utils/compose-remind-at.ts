const TIME = /^(\d{2}):(\d{2})$/;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The moment of a local day (`YYYY-MM-DD`) and time (`HH:mm`, empty = `fallbackTime`) as a `Date`
 * in the browser's time zone, or `null` when either cannot be read.
 */
export function composeRemindAt(day: string, time: string, fallbackTime = '09:00'): Date | null {
  const date = DAY.exec(day);
  const clock = TIME.exec(time.trim() || fallbackTime);
  if (!date || !clock) {
    return null;
  }
  const hours = Number(clock[1]);
  const minutes = Number(clock[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]), hours, minutes, 0, 0);
}

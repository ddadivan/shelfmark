/** Minutes since midnight of `HH:MM`. */
function minutesOf(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** Minutes since midnight of `now` on the clock of `timeZone` (UTC for an unknown zone). */
function localMinutes(now: Date, timeZone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return (hour % 24) * 60 + minute;
}

/**
 * True when `now` falls in the quiet hours `from`–`to` on the device's clock. The range may cross
 * midnight (22:00–08:00); `from` is inside, `to` is not; equal bounds or `null` mean no quiet hours.
 */
export function isQuietAt(
  now: Date,
  from: string | null,
  to: string | null,
  timeZone: string,
): boolean {
  if (from === null || to === null || from === to) {
    return false;
  }
  const start = minutesOf(from);
  const end = minutesOf(to);
  const at = localMinutes(now, timeZone);
  return start < end ? at >= start && at < end : at >= start || at < end;
}

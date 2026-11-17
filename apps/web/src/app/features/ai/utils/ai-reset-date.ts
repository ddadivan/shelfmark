/**
 * The day of `AiUsage.resetsOn` (`YYYY-MM-DD`, a UTC date) as a `Date` at noon UTC, so formatting
 * it in any time zone shows that same day; `null` for anything else.
 */
export function aiResetDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return null;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return Number.isNaN(date.getTime()) ? null : date;
}

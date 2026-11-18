const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` of the UTC day of `now` (the `mcp_token_usage.day` key). */
export function usageDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` of the UTC day `days` days before the day of `now`. */
export function usageDayBefore(now: Date, days: number): string {
  return usageDay(new Date(now.getTime() - days * DAY_MS));
}

/** Whole seconds until the next UTC midnight (at least 1): the `Retry-After` of the daily cap. */
export function secondsUntilNextUtcDay(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

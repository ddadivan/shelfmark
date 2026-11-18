/** `YYYY-MM-DD` of the first day of the UTC month of `now` (the `ai_usage.month` key). */
export function usageMonth(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` of the first day of the next UTC month: when the monthly count resets. */
export function usageResetsOn(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
}

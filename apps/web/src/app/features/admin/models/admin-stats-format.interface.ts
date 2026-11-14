/** What the stats rows need to word themselves: translation and the locale's number formats. */
export interface AdminStatsFormat {
  t(key: string, params?: Record<string, unknown>): string;
  /** A share from 0 to 1 as a whole percent ("38%"). */
  percent(share: number): string;
  number(value: number): string;
}

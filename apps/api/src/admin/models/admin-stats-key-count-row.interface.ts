/** One row of a grouped stats query: a key (a day, a week) and a count. */
export interface AdminStatsKeyCountRow {
  key: string;
  count: number;
}

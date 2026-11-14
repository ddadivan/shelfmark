/** One row of a grouped stats query: the dimension (`theme`, `kind`, ...), its value and a count. */
export interface AdminStatsDimensionRow {
  dim: string;
  key: string;
  count: number;
}

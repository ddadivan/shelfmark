/** Ratings of one milestone by real users, straight from the grouped query. */
export interface AdminStatsMilestoneRow {
  milestone: string;
  answered: number;
  skipped: number;
  mean: number | null;
  median: number | null;
  low: number;
  mid: number;
  high: number;
}

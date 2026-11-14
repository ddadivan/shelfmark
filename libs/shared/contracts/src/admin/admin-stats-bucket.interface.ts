/**
 * One bucket of a distribution: an allow-listed value, `other` or `never`
 * (`ADMIN_STATS_BUCKET_KEY`). `count` is `null` when even the merged "Other" stays below the
 * minimum group size.
 */
export interface AdminStatsBucket {
  key: string;
  count: number | null;
}

import type { AdminStatsBucket, AdminStatsRate } from '@shelfmark/contracts';
import type { AdminShareRow } from '../models/admin-share-row.interface';
import type { AdminStatsFormat } from '../models/admin-stats-format.interface';

/** "38% · 18 of 47", or "Not enough users yet" while the rate is hidden. */
export function rateText(rate: AdminStatsRate, format: AdminStatsFormat): string {
  if (rate.share === null || rate.count === null) return format.t('admin.stats.notEnough');
  return format.t('admin.stats.shareOf', {
    percent: format.percent(rate.share),
    count: format.number(rate.count),
    base: format.number(rate.base),
  });
}

/** A labelled rate as a meter row. */
export function rateRow(
  key: string,
  label: string,
  rate: AdminStatsRate,
  format: AdminStatsFormat,
): AdminShareRow {
  return {
    key,
    label,
    percent: rate.share === null ? null : Math.round(rate.share * 100),
    text: rateText(rate, format),
  };
}

/**
 * A distribution as meter rows, each a share of everyone shown in it; a hidden "Other" reads
 * "Fewer than 3" and counts towards nothing. `labelOf` words a bucket key.
 */
export function bucketRows(
  buckets: readonly AdminStatsBucket[],
  labelOf: (key: string) => string,
  format: AdminStatsFormat,
  minGroup: number,
): AdminShareRow[] {
  const base = buckets.reduce((sum, bucket) => sum + (bucket.count ?? 0), 0);
  return buckets.map((bucket) => {
    if (bucket.count === null) {
      return {
        key: bucket.key,
        label: labelOf(bucket.key),
        percent: null,
        text: format.t('admin.stats.fewer', { min: minGroup }),
      };
    }
    const share = base === 0 ? 0 : bucket.count / base;
    return {
      key: bucket.key,
      label: labelOf(bucket.key),
      percent: Math.round(share * 100),
      text: format.t('admin.stats.shareCount', {
        percent: format.percent(share),
        count: format.number(bucket.count),
      }),
    };
  });
}

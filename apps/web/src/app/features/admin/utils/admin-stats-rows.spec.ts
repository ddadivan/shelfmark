import type { AdminStatsFormat } from '../models/admin-stats-format.interface';
import { bucketRows, rateRow, rateText } from './admin-stats-rows';

const format: AdminStatsFormat = {
  t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
  percent: (share) => `${Math.round(share * 100)}%`,
  number: (value) => String(value),
};

describe('admin stats rows', () => {
  it('words a shown rate and a hidden one', () => {
    expect(rateText({ base: 47, count: 18, share: 0.383 }, format)).toBe(
      'admin.stats.shareOf {"percent":"38%","count":"18","base":"47"}',
    );
    expect(rateText({ base: 2, count: null, share: null }, format)).toBe('admin.stats.notEnough');
  });

  it('turns a rate into a meter row', () => {
    expect(rateRow('tags', 'Tags', { base: 4, count: 1, share: 0.25 }, format)).toEqual({
      key: 'tags',
      label: 'Tags',
      percent: 25,
      text: 'admin.stats.shareOf {"percent":"25%","count":"1","base":"4"}',
    });
    expect(
      rateRow('tags', 'Tags', { base: 1, count: null, share: null }, format).percent,
    ).toBeNull();
  });

  it('shares a distribution among the shown buckets; a hidden Other counts for nothing', () => {
    const rows = bucketRows(
      [
        { key: 'dark', count: 3 },
        { key: 'light', count: 0 },
        { key: 'other', count: null },
      ],
      (key) => key.toUpperCase(),
      format,
      3,
    );
    expect(rows).toEqual([
      {
        key: 'dark',
        label: 'DARK',
        percent: 100,
        text: 'admin.stats.shareCount {"percent":"100%","count":"3"}',
      },
      {
        key: 'light',
        label: 'LIGHT',
        percent: 0,
        text: 'admin.stats.shareCount {"percent":"0%","count":"0"}',
      },
      { key: 'other', label: 'OTHER', percent: null, text: 'admin.stats.fewer {"min":3}' },
    ]);
  });

  it('reads an empty distribution as zero', () => {
    expect(bucketRows([{ key: 'a', count: 0 }], (key) => key, format, 3)[0].percent).toBe(0);
  });
});

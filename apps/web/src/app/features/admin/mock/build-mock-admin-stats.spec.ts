import { expectAdminStatsShape } from '@shelfmark/contract-tests';
import { buildMockAdminStats } from './build-mock-admin-stats';

describe('buildMockAdminStats', () => {
  it.each([
    ['full', false],
    ['few', true],
  ])('answers the %s fixture in the agreed shape, small groups hidden', (_label, few) => {
    const now = new Date('2026-11-15T23:59:00Z');
    expect(() => expectAdminStatsShape(buildMockAdminStats(now, few), now)).not.toThrow();
  });

  it('adds up the merged buckets to the real users', () => {
    const stats = buildMockAdminStats(new Date());
    const sum = (buckets: { count: number | null }[]) =>
      buckets.reduce((total, bucket) => total + (bucket.count ?? 0), 0);
    expect(sum(stats.preferences.theme)).toBe(stats.overview.realUsers);
    expect(sum(stats.preferences.language)).toBe(stats.overview.realUsers);
    expect(sum(stats.preferences.trashRetention)).toBe(stats.overview.realUsers);
    expect(sum(stats.features.linksPerUser.buckets)).toBe(stats.overview.realUsers);
  });
});

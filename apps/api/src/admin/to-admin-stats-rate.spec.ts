import { toAdminStatsRate } from './to-admin-stats-rate';

describe('toAdminStatsRate', () => {
  it('hides count and share while the base is below the minimum group size', () => {
    expect(toAdminStatsRate(2, 1, 3)).toEqual({ base: 2, count: null, share: null });
    expect(toAdminStatsRate(0, 0, 0)).toEqual({ base: 0, count: null, share: null });
  });

  it('answers the share rounded to three decimals from the minimum group size on', () => {
    expect(toAdminStatsRate(3, 1, 3)).toEqual({ base: 3, count: 1, share: 0.333 });
    expect(toAdminStatsRate(8, 8, 3)).toEqual({ base: 8, count: 8, share: 1 });
    expect(toAdminStatsRate(5, 0, 3)).toEqual({ base: 5, count: 0, share: 0 });
  });
});

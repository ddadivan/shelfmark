import { lastUtcDays, lastUtcWeeks } from './admin-stats-days';

describe('admin stats days', () => {
  it('lists the last UTC days oldest first, today last, across a month end', () => {
    expect(lastUtcDays(new Date('2026-03-02T23:59:00Z'), 4)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });

  it('lists the Mondays of the last ISO weeks, this week last', () => {
    // 2026-11-15 is a Sunday: its week starts on Monday 2026-11-09.
    expect(lastUtcWeeks(new Date('2026-11-15T12:00:00Z'), 3)).toEqual([
      '2026-10-26',
      '2026-11-02',
      '2026-11-09',
    ]);
    expect(lastUtcWeeks(new Date('2026-11-16T00:00:00Z'), 1)).toEqual(['2026-11-16']);
  });
});

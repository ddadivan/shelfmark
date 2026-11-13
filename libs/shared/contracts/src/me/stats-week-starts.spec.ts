import { statsWeekStarts } from './stats-week-starts';

describe('statsWeekStarts', () => {
  it('lists 12 Mondays, oldest first, the current week last', () => {
    // Friday 13 November 2026.
    const weeks = statsWeekStarts(new Date('2026-11-13T15:00:00Z'));

    expect(weeks).toHaveLength(12);
    expect(weeks.at(-1)).toBe('2026-11-09');
    expect(weeks[0]).toBe('2026-08-24');
    for (const day of weeks) {
      expect(new Date(`${day}T00:00:00Z`).getUTCDay()).toBe(1);
    }
  });

  it('starts the week on the Monday itself and keeps Sunday in the week before', () => {
    expect(statsWeekStarts(new Date('2026-11-09T00:00:00Z')).at(-1)).toBe('2026-11-09');
    expect(statsWeekStarts(new Date('2026-11-08T23:59:59Z')).at(-1)).toBe('2026-11-02');
  });
});

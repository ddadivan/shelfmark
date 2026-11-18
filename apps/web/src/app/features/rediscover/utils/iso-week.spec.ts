import { isoWeek } from './iso-week';

describe('isoWeek', () => {
  it('names the ISO week in UTC, Monday first, across year ends', () => {
    expect(isoWeek(Date.UTC(2026, 10, 18))).toBe('2026-W47');
    expect(isoWeek(Date.UTC(2026, 10, 16))).toBe('2026-W47');
    expect(isoWeek(Date.UTC(2026, 10, 15, 23))).toBe('2026-W46');
    expect(isoWeek(Date.UTC(2027, 0, 1))).toBe('2026-W53');
    expect(isoWeek(Date.UTC(2025, 11, 29))).toBe('2026-W01');
  });
});

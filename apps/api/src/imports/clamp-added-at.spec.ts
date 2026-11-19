import { clampAddedAt } from './clamp-added-at';

const NOW = new Date('2026-11-19T12:00:00Z');

describe('clampAddedAt', () => {
  it('keeps a date in the past as it is, whatever the offset', () => {
    expect(clampAddedAt('2021-03-04T10:20:30+02:00', NOW)?.toISOString()).toBe(
      '2021-03-04T08:20:30.000Z',
    );
  });

  it('turns a date in the future into now', () => {
    expect(clampAddedAt('2031-01-01T00:00:00Z', NOW)).toEqual(NOW);
  });

  it('ignores a date before 1990 (keep the batch order) but keeps 1990-01-01 itself', () => {
    expect(clampAddedAt('1970-01-01T00:00:00Z', NOW)).toBeUndefined();
    expect(clampAddedAt('1989-12-31T23:59:59Z', NOW)).toBeUndefined();
    expect(clampAddedAt('1990-01-01T00:00:00Z', NOW)?.toISOString()).toBe(
      '1990-01-01T00:00:00.000Z',
    );
  });

  it('ignores a missing or unreadable date', () => {
    expect(clampAddedAt(undefined, NOW)).toBeUndefined();
    expect(clampAddedAt('not a date', NOW)).toBeUndefined();
  });
});

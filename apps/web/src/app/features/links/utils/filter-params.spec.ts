import { parseFavoriteParam, parseSavedWithin, savedWithin } from './filter-params';

describe('filter params', () => {
  it('reads ?saved= as week or month, anything else as any time', () => {
    expect(parseSavedWithin('week')).toBe('week');
    expect(parseSavedWithin('month')).toBe('month');
    expect(parseSavedWithin('year')).toBeUndefined();
    expect(parseSavedWithin(['week', 'month'])).toBeUndefined();
    expect(parseSavedWithin(undefined)).toBeUndefined();
  });

  it('reads ?fav=1 only as on', () => {
    expect(parseFavoriteParam('1')).toBe(true);
    expect(parseFavoriteParam('true')).toBe(false);
    expect(parseFavoriteParam(undefined)).toBe(false);
  });

  it('counts the period back from now', () => {
    const now = Date.parse('2026-11-24T12:00:00.000Z');
    expect(savedWithin('2026-11-18T12:00:00.000Z', 'week', now)).toBe(true);
    expect(savedWithin('2026-11-16T12:00:00.000Z', 'week', now)).toBe(false);
    expect(savedWithin('2026-11-01T12:00:00.000Z', 'month', now)).toBe(true);
    expect(savedWithin('2026-10-20T12:00:00.000Z', 'month', now)).toBe(false);
  });
});

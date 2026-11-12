import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
import { daysLeft } from './trash-days-left';

const NOW = Date.parse('2026-11-10T12:00:00.000Z');

describe('daysLeft', () => {
  it('reads a full retention as its number of days', () => {
    expect(daysLeft(new Date(NOW + 30 * MS_PER_DAY).toISOString(), NOW)).toBe(30);
  });

  it('rounds up, so a partial day still counts as one', () => {
    expect(daysLeft(new Date(NOW + 3 * MS_PER_DAY - 60_000).toISOString(), NOW)).toBe(3);
    expect(daysLeft(new Date(NOW + 60_000).toISOString(), NOW)).toBe(1);
  });

  it('is zero or less when the entry is overdue', () => {
    expect(daysLeft(new Date(NOW - 5 * MS_PER_DAY).toISOString(), NOW)).toBeLessThanOrEqual(0);
  });
});

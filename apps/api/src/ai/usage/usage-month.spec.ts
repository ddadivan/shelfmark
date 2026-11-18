import { usageMonth, usageResetsOn } from './usage-month';

describe('usage month', () => {
  it('keys by the first UTC day of the month', () => {
    expect(usageMonth(new Date('2026-11-30T23:59:59.999Z'))).toBe('2026-11-01');
    expect(usageMonth(new Date('2026-12-01T00:00:00.000Z'))).toBe('2026-12-01');
  });

  it('resets on the first day of the next UTC month, across the year', () => {
    expect(usageResetsOn(new Date('2026-11-17T12:00:00Z'))).toBe('2026-12-01');
    expect(usageResetsOn(new Date('2026-12-31T23:00:00Z'))).toBe('2027-01-01');
  });
});

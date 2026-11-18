import { secondsUntilNextUtcDay, usageDay, usageDayBefore } from './usage-day';

describe('usage days', () => {
  const now = new Date('2026-12-02T23:59:30.250Z');

  it('uses the UTC day', () => {
    expect(usageDay(now)).toBe('2026-12-02');
    expect(usageDayBefore(now, 6)).toBe('2026-11-26');
    expect(usageDayBefore(now, 35)).toBe('2026-10-28');
  });

  it('counts the seconds to the next UTC midnight, at least one', () => {
    expect(secondsUntilNextUtcDay(now)).toBe(30);
    expect(secondsUntilNextUtcDay(new Date('2026-12-02T00:00:00.000Z'))).toBe(86_400);
    expect(secondsUntilNextUtcDay(new Date('2026-12-02T23:59:59.999Z'))).toBe(1);
  });
});

import { aiResetDate } from './ai-reset-date';

describe('aiResetDate', () => {
  it('reads the UTC day at noon, so every time zone shows the same day', () => {
    expect(aiResetDate('2026-12-01')?.toISOString()).toBe('2026-12-01T12:00:00.000Z');
  });

  it('refuses anything that is not a plain date', () => {
    expect(aiResetDate('')).toBeNull();
    expect(aiResetDate('2026-12-01T00:00:00Z')).toBeNull();
    expect(aiResetDate('soon')).toBeNull();
  });
});

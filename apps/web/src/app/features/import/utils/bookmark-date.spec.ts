import { bookmarkDate } from './bookmark-date';

const NOW = Date.UTC(2026, 10, 19);

describe('bookmarkDate', () => {
  it('reads seconds, milliseconds and microseconds', () => {
    const iso = new Date(1_700_000_000_000).toISOString();

    expect(bookmarkDate('1700000000', NOW)).toBe(iso);
    expect(bookmarkDate('1700000000000', NOW)).toBe(iso);
    expect(bookmarkDate('1700000000000000', NOW)).toBe(iso);
    expect(bookmarkDate(' 1700000000 ', NOW)).toBe(iso);
  });

  it('drops missing, malformed, too old and future values', () => {
    expect(bookmarkDate(null, NOW)).toBeUndefined();
    expect(bookmarkDate('', NOW)).toBeUndefined();
    expect(bookmarkDate('-5', NOW)).toBeUndefined();
    expect(bookmarkDate('1.5e9', NOW)).toBeUndefined();
    expect(bookmarkDate('0', NOW)).toBeUndefined();
    expect(bookmarkDate(String(NOW / 1000 + 60), NOW)).toBeUndefined();
  });
});

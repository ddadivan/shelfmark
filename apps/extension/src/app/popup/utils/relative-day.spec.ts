import { relativeDay } from './relative-day';

const NOW = Date.parse('2026-06-15T12:00:00.000Z');
const ago = (ms: number): string => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('relativeDay', () => {
  it('uses minutes below an hour', () => {
    expect(relativeDay(ago(5 * MIN), 'en', NOW)).toBe('5 minutes ago');
  });

  it('uses hours below a day', () => {
    expect(relativeDay(ago(3 * HOUR), 'en', NOW)).toBe('3 hours ago');
  });

  it('says yesterday for one day', () => {
    expect(relativeDay(ago(DAY), 'en', NOW)).toBe('yesterday');
  });

  it('uses days below 30 days', () => {
    expect(relativeDay(ago(2 * DAY), 'en', NOW)).toBe('2 days ago');
  });

  it('uses months below a year', () => {
    expect(relativeDay(ago(65 * DAY), 'en', NOW)).toBe('2 months ago');
  });

  it('uses years from 365 days', () => {
    expect(relativeDay(ago(800 * DAY), 'en', NOW)).toBe('2 years ago');
  });

  it('follows the given language', () => {
    expect(relativeDay(ago(3 * DAY), 'fr', NOW)).toBe('il y a 3 jours');
  });

  it('defaults to the current clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      expect(relativeDay(ago(2 * DAY), 'en')).toBe('2 days ago');
    } finally {
      vi.useRealTimers();
    }
  });
});

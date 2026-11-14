import { relativeTime, relativeTimeFormat } from './relative-time';

const NOW = Date.parse('2026-11-07T12:00:00Z');

describe('relativeTime', () => {
  it.each([
    ['2026-11-07T12:00:00Z', 'now'],
    ['2026-11-07T11:30:00Z', '30 minutes ago'],
    ['2026-11-07T09:00:00Z', '3 hours ago'],
    ['2026-11-06T11:00:00Z', 'yesterday'],
    ['2026-10-17T12:00:00Z', '3 weeks ago'],
    ['2026-09-07T12:00:00Z', '2 months ago'],
    ['2025-11-07T12:00:00Z', 'last year'],
    ['2026-11-08T12:00:00Z', 'now'],
  ])('%s -> %s', (iso, expected) => {
    expect(relativeTime(iso, NOW, 'en')).toBe(expected);
  });

  it('follows the locale', () => {
    expect(relativeTime('2026-11-06T11:00:00Z', NOW, 'uk')).toBe('учора');
  });

  it('builds one formatter per locale and reuses it', () => {
    expect(relativeTimeFormat('en')).toBe(relativeTimeFormat('en'));
    expect(relativeTimeFormat('fr')).not.toBe(relativeTimeFormat('en'));
    expect(relativeTimeFormat('fr').resolvedOptions().numeric).toBe('auto');
  });
});

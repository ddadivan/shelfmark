import type { Matcher } from '../models/matcher.interface';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function matcher(label: string, test: (actual: unknown) => boolean): Matcher {
  return { matcher: true, label, test };
}

/**
 * Placeholders for values that differ between runs and between the back ends (ids, timestamps,
 * tokens). Everything else in an expected value is compared exactly.
 */
export const ANY = {
  /** A UUID. */
  id: matcher('any id', (v) => typeof v === 'string' && UUID.test(v)),
  /** An ISO 8601 UTC timestamp. */
  time: matcher('any timestamp', (v) => typeof v === 'string' && ISO_TIME.test(v)),
  /** A non-empty string. */
  text: matcher('any non-empty string', (v) => typeof v === 'string' && v !== ''),
  /** A string that matches `pattern`. */
  matching: (pattern: RegExp): Matcher =>
    matcher(`a string matching ${pattern}`, (v) => typeof v === 'string' && pattern.test(v)),
} as const;

/**
 * The shared tag name rule: surrounding whitespace is trimmed and every run of whitespace becomes
 * one hyphen; the case is kept. Callers validate the result: not empty, at most `TAG_LIMIT.NameMax`
 * characters, unique per user case-insensitively.
 */
export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, '-');
}

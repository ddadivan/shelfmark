import { normalizeTagName } from '@shelfmark/contracts';

/**
 * Tag names as the API stores them: each one normalized with `normalizeTagName` (spaces become
 * hyphens), empty ones dropped, duplicates collapsed ignoring case (the first spelling wins).
 * Order is kept. Returns the same array when nothing changes.
 */
export function normalizeTagNames(names: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = normalizeTagName(raw);
    if (name !== '' && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      result.push(name);
    }
  }
  return result.length === names.length && result.every((name, index) => name === names[index])
    ? names
    : result;
}

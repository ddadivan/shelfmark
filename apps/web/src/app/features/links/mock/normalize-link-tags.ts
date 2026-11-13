import { normalizeTagName } from '@shelfmark/contracts';

/**
 * The tags of a link as the API stores and answers them: names normalised, unique ignoring case
 * (the first spelling wins), listed by name.
 */
export function normalizeLinkTags(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of names) {
    const name = normalizeTagName(raw);
    if (name !== '' && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      tags.push(name);
    }
  }
  return tags.sort((a, b) => a.localeCompare(b, 'en'));
}

import { LINK_LIMIT, normalizeTagName } from '@shelfmark/contracts';

/**
 * The tags of `?tag=` (one value or a repeated parameter): each normalized like a tag name,
 * empty ones dropped, duplicates collapsed ignoring case (the first spelling wins), and at most
 * `LINK_LIMIT.TagFilterMax` kept, the rest ignored. Anything that is not text is ignored.
 */
export function parseTagFilter(raw: unknown): string[] {
  const values: unknown[] = Array.isArray(raw) ? raw : [raw];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    const name = normalizeTagName(value);
    if (name !== '' && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      tags.push(name);
    }
    if (tags.length === LINK_LIMIT.TagFilterMax) {
      break;
    }
  }
  return tags;
}

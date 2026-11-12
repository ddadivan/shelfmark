import type { LinkResponse } from '@shelfmark/contracts';
import { linkHost } from './link-view';

/** Lower-case words of a search; empty for a blank one. */
export function searchWords(query: string): string[] {
  return query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
}

/**
 * The in-page search of Recently opened: every word must appear in the title or the domain
 * (case-insensitive). No words match everything.
 */
export function matchesHistorySearch(link: LinkResponse, words: readonly string[]): boolean {
  if (words.length === 0) {
    return true;
  }
  const haystack = `${link.title} ${linkHost(link.url)}`.toLocaleLowerCase();
  return words.every((word) => haystack.includes(word));
}

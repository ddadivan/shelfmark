import { LINK_LIMIT, type LinkResponse } from '@shelfmark/contracts';
import { SEARCH_TERMS_MAX } from './models/search-terms-max.const';

/**
 * The search text of `?q=`: trimmed, runs of white space collapsed, at most `SEARCH_TERMS_MAX`
 * words and `LINK_LIMIT.QueryMax` characters. Anything that is not text (a repeated parameter
 * too) is no search.
 */
export function parseSearchQuery(raw: unknown): string {
  return typeof raw === 'string'
    ? splitQuery(raw).join(' ').slice(0, LINK_LIMIT.QueryMax).trim()
    : '';
}

/** The words of a search text (white space separates them); only the first `SEARCH_TERMS_MAX` count. */
export function splitQuery(query: string): string[] {
  return query
    .split(/\s+/u)
    .filter((word) => word !== '')
    .slice(0, SEARCH_TERMS_MAX);
}

/** Whether every word of the query is in the title, the note or the URL of the link, ignoring case. */
export function matchesQuery(
  link: Pick<LinkResponse, 'title' | 'note' | 'url'>,
  query: string,
): boolean {
  const haystack = `${link.title}\n${link.note ?? ''}\n${link.url}`.toLowerCase();
  return splitQuery(query).every((word) => haystack.includes(word.toLowerCase()));
}

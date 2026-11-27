import { LINK_LIMIT, searchTerms, type LinkResponse } from '@shelfmark/contracts';

/**
 * The search text of `?q=`: trimmed, runs of white space collapsed, at most `LINK_LIMIT.QueryTermsMax`
 * words and `LINK_LIMIT.QueryMax` characters. Anything that is not text (a repeated parameter
 * too) is no search.
 */
export function parseSearchQuery(raw: unknown): string {
  return typeof raw === 'string'
    ? searchTerms(raw).join(' ').slice(0, LINK_LIMIT.QueryMax).trim()
    : '';
}

/** Whether every word of the query is in the title, the note or the URL of the link, ignoring case. */
export function matchesQuery(
  link: Pick<LinkResponse, 'title' | 'note' | 'url'>,
  query: string,
): boolean {
  const haystack = `${link.title}\n${link.note ?? ''}\n${link.url}`.toLowerCase();
  return searchTerms(query).every((word) => haystack.includes(word.toLowerCase()));
}

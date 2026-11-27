import { LINK_LIMIT } from './link-limit.const';

/**
 * The words of a search text: split on white space, at most `LINK_LIMIT.QueryTermsMax` are used
 * (extra words are ignored). Shared by the API's link filter and the web's search.
 */
export function searchTerms(q: string | undefined): string[] {
  if (q === undefined) return [];
  return q
    .split(/\s+/u)
    .filter((word) => word !== '')
    .slice(0, LINK_LIMIT.QueryTermsMax);
}

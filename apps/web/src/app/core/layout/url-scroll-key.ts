import { PREVIEW_QUERY_PARAM } from '../../models/preview-query-param.const';
import { urlWithoutFragment } from './url-without-fragment';

/**
 * The part of a router URL that decides whether a navigation starts at the top: the URL without
 * its fragment and without `?preview=` (#553), so opening, switching or closing the link preview
 * keeps the feed where it was.
 */
export function urlScrollKey(url: string): string {
  const base = urlWithoutFragment(url);
  const start = base.indexOf('?');
  if (start === -1) {
    return base;
  }
  const params = new URLSearchParams(base.slice(start + 1));
  params.delete(PREVIEW_QUERY_PARAM);
  const query = params.toString();
  return query === '' ? base.slice(0, start) : `${base.slice(0, start)}?${query}`;
}

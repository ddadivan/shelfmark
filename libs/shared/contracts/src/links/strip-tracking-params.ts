import { TRACKING_QUERY_PARAM_PREFIXES } from './tracking-query-param-prefixes.const';
import { TRACKING_QUERY_PARAMS } from './tracking-query-params.const';

function paramName(segment: string): string {
  const raw = segment.split('=')[0] ?? '';
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' ')).toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

/** True for a query parameter name that only tracks (`TRACKING_QUERY_PARAMS`, `utm_*`). */
export function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    TRACKING_QUERY_PARAMS.includes(lower) ||
    TRACKING_QUERY_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix))
  );
}

/**
 * The URL without its tracking query parameters (#284, "Keep the query part of links" off). The
 * rest of the text stays exactly as written: scheme, host, path, the other parameters (order,
 * encoding, empty values) and the `#fragment`. Without a tracking parameter the input comes back
 * unchanged; when every parameter goes, the `?` goes too. Only http(s) URLs are touched. Pure;
 * shared by the API (on save) and the web mocks.
 */
export function stripTrackingParams(input: string): string {
  const hashAt = input.indexOf('#');
  const beforeHash = hashAt === -1 ? input : input.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : input.slice(hashAt);
  const queryAt = beforeHash.indexOf('?');
  if (queryAt === -1 || !/^https?:\/\//i.test(input.trim())) {
    return input;
  }
  const segments = beforeHash.slice(queryAt + 1).split('&');
  const kept = segments.filter((segment) => segment === '' || !isTrackingParam(paramName(segment)));
  if (kept.length === segments.length) {
    return input;
  }
  const query = kept.filter((segment) => segment !== '').join('&');
  return `${beforeHash.slice(0, queryAt)}${query === '' ? '' : `?${query}`}${hash}`;
}

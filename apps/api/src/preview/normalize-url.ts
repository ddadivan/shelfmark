const TRACKING_PARAM_PREFIX = 'utm_';

function paramName(segment: string): string {
  const raw = segment.split('=')[0] ?? '';
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' ')).toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

/**
 * URL used for duplicate detection (PROJECT.md 6.1): lower-case host, no `#fragment`, no `utm_*`
 * query parameters, no trailing `/`. Pure; input that is not a URL is returned trimmed.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }
  const path = url.pathname.replace(/\/+$/, '');
  const kept = url.search
    .slice(1)
    .split('&')
    .filter((segment) => segment !== '' && !paramName(segment).startsWith(TRACKING_PARAM_PREFIX));
  const query = kept.length > 0 ? `?${kept.join('&')}` : '';
  return `${url.protocol}//${url.host}${path}${query}`;
}

import { isTrackingParam } from './is-tracking-param';
import { queryParamName } from './query-param-name';

const WEB_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/**
 * URL used for duplicate detection (PROJECT.md 6.1): lower-case host, no `#fragment`, no tracking
 * query parameters (`isTrackingParam`: `utm_*`, `gclid`, `fbclid`, …), no trailing `/`. Pure; input that is not a URL is returned trimmed. Shared by the
 * API (stored as `normalizedUrl`) and the web app.
 *
 * Not a sanitizer: it runs after scheme validation and says nothing about whether a URL is safe.
 * Query parameter order is kept as written (6.1 does not sort). Non-http(s) URLs are only trimmed
 * and stripped of the fragment, so `mailto:a@b` and `mailto://a@b` never collide.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }
  if (!WEB_PROTOCOLS.includes(url.protocol)) {
    const hash = trimmed.indexOf('#');
    return hash === -1 ? trimmed : trimmed.slice(0, hash);
  }
  const path = url.pathname.replace(/\/+$/, '');
  const kept = url.search
    .slice(1)
    .split('&')
    .filter((segment) => segment !== '' && !isTrackingParam(queryParamName(segment)));
  const query = kept.length > 0 ? `?${kept.join('&')}` : '';
  return `${url.protocol}//${url.host}${path}${query}`;
}

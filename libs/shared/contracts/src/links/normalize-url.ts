const TRACKING_PARAM_PREFIX = 'utm_';
const WEB_PROTOCOLS: readonly string[] = ['http:', 'https:'];

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
 * query parameters, no trailing `/`. Pure; input that is not a URL is returned trimmed. Shared by the
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
    .filter((segment) => segment !== '' && !paramName(segment).startsWith(TRACKING_PARAM_PREFIX));
  const query = kept.length > 0 ? `?${kept.join('&')}` : '';
  return `${url.protocol}//${url.host}${path}${query}`;
}

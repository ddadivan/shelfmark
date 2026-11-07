const TRACKING_PARAM_PREFIX = 'utm_';

/**
 * Mirrors the server-side normalisation used for duplicate detection (PROJECT.md 6.1): lowercase
 * host, no `#fragment`, no `utm_*` params, no trailing `/`. Returns `null` for anything that is
 * not a parsable URL.
 */
export function normalizeUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith(TRACKING_PARAM_PREFIX)) {
      url.searchParams.delete(key);
    }
  }
  return url.toString().replace(/\/$/, '');
}

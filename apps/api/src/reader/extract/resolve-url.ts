import { stripControlChars } from '../../common/validation/has-control-chars';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';

const HTTP_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/** The page's own address as a base for relative links; `null` when it is not an http(s) URL. */
export function toBaseUrl(pageUrl: string | null): URL | null {
  if (pageUrl === null) return null;
  try {
    const url = new URL(pageUrl);
    return HTTP_PROTOCOLS.has(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function sameDocument(a: URL, b: URL): boolean {
  return a.origin === b.origin && a.pathname === b.pathname && a.search === b.search;
}

/** A link to a part of the page itself (`#part`, or the page's own address with a fragment). */
export function isSamePageFragment(value: string | undefined, base: URL | null): boolean {
  if (value === undefined) return false;
  const raw = value.trim();
  if (raw.startsWith('#')) return true;
  if (base === null) return false;
  try {
    const url = new URL(raw, base);
    return url.hash !== '' && sameDocument(url, base);
  } catch {
    return false;
  }
}

/**
 * An absolute `http` / `https` address for a link or image source of the page, or `null`: other
 * schemes (`javascript:`, `data:`, `mailto:`), credentials, an address of more than
 * `UrlCharsMax` characters, a same-page `#fragment` and a relative address without a base are all
 * dropped. The address is never fetched here.
 */
export function toHttpUrl(value: string | undefined, base: URL | null): string | null {
  if (value === undefined) return null;
  const raw = stripControlChars(value).trim();
  if (raw === '' || raw.startsWith('#') || raw.length > READER_EXTRACT_LIMIT.UrlCharsMax) {
    return null;
  }
  try {
    const url = base === null ? new URL(raw) : new URL(raw, base);
    if (!HTTP_PROTOCOLS.has(url.protocol) || url.username !== '' || url.password !== '') {
      return null;
    }
    if (base !== null && url.hash !== '' && sameDocument(url, base)) return null;
    const href = url.href;
    return href.length <= READER_EXTRACT_LIMIT.UrlCharsMax ? href : null;
  } catch {
    return null;
  }
}

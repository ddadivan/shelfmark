import { isHttpUrl } from '@shelfmark/contracts';
import { displayHost } from './add-link/http-url';

/** The URL when it is safe to put in an `href` (http or https only), else `undefined`. */
export function safeHref(url: string): string | undefined {
  return isHttpUrl(url) ? url : undefined;
}

/** The host to show under a title. */
export function linkHost(url: string): string {
  return displayHost(url);
}

/** Letter of the site, for the favicon and card fallbacks. */
export function siteLetter(url: string): string {
  return displayHost(url).charAt(0).toUpperCase();
}

/** Same-origin prefix of the captured copies served by the API (ADR 0027). */
const LINK_IMAGE_PATH_PREFIX = '/api/links/';

/**
 * The image URL when it is a path of our own API (`/api/links/{id}/image?v=...`), else
 * `undefined`. A remote URL is never bound: the CSP would block it and it would leak the user.
 */
export function ownImageUrl(url: string | null): string | undefined {
  return url?.startsWith(LINK_IMAGE_PATH_PREFIX) ? url : undefined;
}

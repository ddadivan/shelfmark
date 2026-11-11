import { isHttpUrl, LINK_IMAGE_PENDING_VERSION, type LinkResponse } from '@shelfmark/contracts';
import { displayHost } from './add-link/http-url';

/** The URL when it is safe to put in an `href` (http or https only), else `undefined`. */
export function safeHref(url: string): string | undefined {
  return isHttpUrl(url) ? url : undefined;
}

/** The host to show under a title. */
export function linkHost(url: string): string {
  return displayHost(url);
}

/** The address shown on the card's open bar: host and path, without scheme, `www.` or a lone `/`. */
export function linkAddress(url: string): string {
  try {
    const { host, pathname, search } = new URL(url);
    const path = pathname === '/' ? '' : pathname;
    return `${host.replace(/^www\./, '')}${path}${search}`;
  } catch {
    return url;
  }
}

/** Letter of the site, for the favicon and card fallbacks. */
export function siteLetter(url: string): string {
  return displayHost(url).charAt(0).toUpperCase();
}

/**
 * Image paths of our own API: `linkImagePath` (ADR 0027) and the images of a public collection,
 * keyed by its 22-character token (ADR 0040).
 */
const OWN_IMAGE_PATH =
  /^\/api\/(?:links|public\/collections\/[A-Za-z0-9_-]{22}\/links)\/[0-9a-f-]{36}\/(favicon|image)\?v=[0-9a-f]{16}$/;

/**
 * The image URL when it is exactly a path of our own API (`/api/links/{id}/image?v=...` or
 * `/api/public/collections/{token}/links/{id}/image?v=...`), else `undefined`. A remote URL is
 * never bound: the CSP would block it and it would leak the user.
 */
export function ownImageUrl(url: string | null): string | undefined {
  return url !== null && OWN_IMAGE_PATH.test(url) ? url : undefined;
}

/** An image path of our own API whose capture is pending (`?v=pending`): it is never bound. */
function isPendingImagePath(url: string | null): boolean {
  return url !== null && url.endsWith(`?v=${LINK_IMAGE_PENDING_VERSION}`);
}

/** Whether the server marked the images of this link as pending a re-capture (ADR 0027 note). */
export function hasPendingImages(link: LinkResponse): boolean {
  return isPendingImagePath(link.faviconUrl) || isPendingImagePath(link.imageUrl);
}

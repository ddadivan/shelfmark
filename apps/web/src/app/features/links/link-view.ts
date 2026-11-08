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

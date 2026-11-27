import { linkHost } from './link-host';
import { stripWww } from './strip-www';

/**
 * The site a link is sorted by (Site A–Z): its host, lower case, a leading `www.` dropped;
 * an empty string when the text is not a URL. Stored in `links.host`, so the API and the web mock
 * order alike.
 */
export function linkSiteKey(url: string): string {
  return stripWww(linkHost(url) ?? '');
}

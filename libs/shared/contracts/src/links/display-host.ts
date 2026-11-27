import { linkHost } from './link-host';
import { stripWww } from './strip-www';

/** The host of a URL without `www.` for display, or the input itself when it is not a URL. */
export function displayHost(url: string): string {
  const host = linkHost(url);
  return host === null ? url : stripWww(host);
}

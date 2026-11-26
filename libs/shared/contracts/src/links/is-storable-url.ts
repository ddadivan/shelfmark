import { hasControlChars } from './has-control-chars';
import { isHttpUrl } from './is-http-url';
import { LINK_LIMIT } from './link-limit.const';

/**
 * The one rule for a URL that may be saved: an absolute http(s) URL without credentials or control
 * characters anywhere in the raw text, at most `LINK_LIMIT.UrlMax` characters. Control characters
 * are checked on the raw text because `new URL` silently drops tabs and line breaks. Shared by the
 * API (`IsHttpUrl` on every link DTO), the web app and the browser extension; one URL the API
 * rejects fails a whole batch with a 400, so every client checks it before sending.
 */
export function isStorableUrl(value: string): boolean {
  if (value.length > LINK_LIMIT.UrlMax || hasControlChars(value) || !isHttpUrl(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

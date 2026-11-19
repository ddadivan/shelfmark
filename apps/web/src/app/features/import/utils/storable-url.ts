import { isHttpUrl, LINK_LIMIT } from '@shelfmark/contracts';

const DEL = 0x7f;
const LAST_C0 = 0x1f;

function hasControlChars(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= LAST_C0 || code === DEL) return true;
  }
  return false;
}

/**
 * The rules of the API's `isStorableUrl` (`IsHttpUrl` on every link DTO): an absolute http(s) URL
 * without credentials or control characters anywhere in the raw text, at most `LINK_LIMIT.UrlMax`
 * characters. One URL the API rejects fails the whole 100-link batch with a 400, so the import
 * keeps such links out before it sends anything. The API's copy could later import this one.
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

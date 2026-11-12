import { LINK_LIMIT } from '@shelfmark/contracts';
import { SHARE_INPUT_LIMIT } from '../models/share-input-limit.const';
import type { SharedLink } from '../models/shared-link.interface';
import type { SharedLinkParams } from '../models/shared-link-params.interface';

// Control characters, line / paragraph separators, zero-width and bidi override characters:
// invisible text that could disguise a URL or a title.
const INVISIBLE =
  // eslint-disable-next-line no-control-regex -- control characters are exactly what is removed
  /[\u{0}-\u{1f}\u{7f}-\u{9f}\u{ad}\u{200b}-\u{200f}\u{2028}-\u{202e}\u{2060}-\u{206f}\u{feff}]/gu;
// A candidate runs from `http(s)://` to the next whitespace or character that cannot be part of
// a URL when it is pasted into a sentence. It must not hang off another scheme (`blob:https://`,
// `view-source:https://`) or a word (`xhttps://`).
const URL_CANDIDATE = /(?<![A-Za-z0-9+.-]:?)https?:\/\/[^\s<>"'`]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?'"»”’\]}]$/;
const HTTP_PROTOCOLS: readonly string[] = ['http:', 'https:'];

function asText(value: unknown): string {
  return typeof value === 'string'
    ? value.slice(0, SHARE_INPUT_LIMIT.ParamMax).replace(INVISIBLE, ' ')
    : '';
}

function count(value: string, char: string): number {
  return value.split(char).length - 1;
}

/** Drops what a sentence glues to the end of a URL: `.`, `,`, a `)` that has no opening one. */
function trimTrailing(candidate: string): string {
  let url = candidate;
  for (;;) {
    if (TRAILING_PUNCTUATION.test(url)) {
      url = url.slice(0, -1);
    } else if (url.endsWith(')') && count(url, ')') > count(url, '(')) {
      url = url.slice(0, -1);
    } else {
      return url;
    }
  }
}

/** The URL when it is a plain http(s) address with a host and no credentials, else `null`. */
function toHttpUrl(candidate: string): string | null {
  try {
    const url = new URL(trimTrailing(candidate));
    if (
      !HTTP_PROTOCOLS.includes(url.protocol) ||
      url.hostname === '' ||
      url.username !== '' ||
      url.password !== '' ||
      url.href.length > LINK_LIMIT.UrlMax
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function firstHttpUrl(source: unknown): string | null {
  for (const match of asText(source).matchAll(URL_CANDIDATE)) {
    const url = toHttpUrl(match[0]);
    if (url !== null) {
      return url;
    }
  }
  return null;
}

/**
 * Reads the Web Share Target query (`url`, `text`, `title`): the first http(s) URL of `url`,
 * else of `text` (Telegram and others put the link in the text). Every other scheme
 * (`javascript:`, `data:`, `file:`, `intent:`, ...) is ignored, as are addresses with
 * credentials or beyond the contract's length. `title` is never a URL source, only a title hint.
 * The result is plain text to be bound as text, never as HTML.
 */
export function extractSharedLink(params: SharedLinkParams): SharedLink {
  const title = asText(params.title).replace(/\s+/g, ' ').trim();
  return {
    url: firstHttpUrl(params.url) ?? firstHttpUrl(params.text),
    titleHint: title.slice(0, LINK_LIMIT.TitleMax),
  };
}

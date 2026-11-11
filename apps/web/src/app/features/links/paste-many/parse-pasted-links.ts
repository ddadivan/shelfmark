import { isHttpUrl, LINK_LIMIT, normalizeUrl } from '@shelfmark/contracts';
import type { ParsedPaste } from './models/parsed-paste.interface';
import { PASTE_LIMIT } from './models/paste-limits.const';

/**
 * A link inside any text: an explicit `http(s)://` URL, or a bare domain with a path or a `www.`
 * host (`dev.to/ngrx/signalstore-testing`, `www.example.com`). A bare domain needs a dotted host
 * that ends in a letter-only top-level label of two or more letters, so "e.g.", "v1.2" or file
 * names are not links. Whitespace, quotes and angle brackets end a link.
 */
const LINK_PATTERN =
  /\bhttps?:\/\/(?:(?!,https?:\/\/)[^\s<>"'`])+|(?<![@\w.\-/:])(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:\/[^\s<>"'`]*)?/giu;

/** Punctuation that ends a sentence rather than the link. */
const TRAILING = new Set([
  '.',
  ',',
  ';',
  ':',
  '!',
  '?',
  "'",
  '"',
  '»',
  '”',
  '’',
  ')',
  ']',
  '}',
  '*',
  '_',
]);

/** Whether a bare match (no scheme) is a link at all: it needs a path or a `www.` host. */
function isBareLink(match: string): boolean {
  return match.includes('/') || /^www\./iu.test(match);
}

/**
 * Cuts sentence punctuation off the end of a match. A closing parenthesis stays when the link
 * opened one (`https://en.wikipedia.org/wiki/Angular_(web_framework)`).
 */
function trimTrailing(match: string): string {
  let link = match;
  while (link.length > 0 && TRAILING.has(link.charAt(link.length - 1))) {
    if (link.endsWith(')') && count(link, '(') >= count(link, ')')) {
      return link;
    }
    link = link.slice(0, -1);
  }
  return link;
}

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

/** The link as it will be saved: `https://` for a bare domain, `null` when it is not a storable http(s) URL. */
function toUrl(match: string): string | null {
  const trimmed = trimTrailing(match);
  const scheme = /^https?:\/\//iu.test(trimmed);
  if (!scheme && !isBareLink(trimmed)) {
    return null;
  }
  const url = scheme ? trimmed : `https://${trimmed}`;
  if (url.length > LINK_LIMIT.UrlMax || !isHttpUrl(url)) {
    return null;
  }
  const parsed = new URL(url);
  return parsed.username === '' && parsed.password === '' ? url : null;
}

/** A non-link line for the list: trimmed, inner whitespace collapsed, shortened by code points. */
function skippedText(line: string): string {
  const text = line.replace(/\s+/gu, ' ').trim();
  const chars = [...text];
  return chars.length > PASTE_LIMIT.SkippedLength
    ? `${chars.slice(0, PASTE_LIMIT.SkippedLength - 1).join('')}…`
    : text;
}

/**
 * Reads the links out of pasted text: one link per line, or links anywhere inside a message, a
 * list or a note. Bare domains with a path become `https://` links; the same link twice (by
 * `normalizeUrl`, so `utm_*`, a fragment or a trailing slash do not count) is kept once; lines
 * without a link are listed as skipped. At most `LINK_LIMIT.BatchMax` links are kept, the rest is
 * counted in `overflow`. Pure.
 */
export function parsePastedLinks(text: string): ParsedPaste {
  const links: string[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  let found = 0;
  for (const line of text.slice(0, PASTE_LIMIT.TextMax).split(/\r\n|\r|\n/u)) {
    let lineHasLink = false;
    for (const match of line.matchAll(LINK_PATTERN)) {
      const url = toUrl(match[0]);
      if (url === null) {
        continue;
      }
      lineHasLink = true;
      const key = normalizeUrl(url).toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      found++;
      if (links.length < LINK_LIMIT.BatchMax) {
        links.push(url);
      }
    }
    const rest = line.trim();
    if (!lineHasLink && rest !== '' && skipped.length < PASTE_LIMIT.SkippedMax) {
      skipped.push(skippedText(rest));
    }
  }
  return { links, skipped, overflow: found - links.length, found };
}

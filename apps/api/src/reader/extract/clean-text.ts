import { stripControlChars } from '@shelfmark/contracts';

const ELLIPSIS = '…';
const LINE_FEED = '\n';
const TAB = '\t';

/** Cuts `value` to at most `max` characters, at the last space when there is one in reach. */
function cut(value: string, max: number): string {
  if (value.length <= max) return value;
  const head = value.slice(0, max - 1);
  const space = head.lastIndexOf(' ');
  return `${(space > max / 2 ? head.slice(0, space) : head).trimEnd()}${ELLIPSIS}`;
}

/**
 * Page text for a paragraph, heading, quote or list item: control characters become spaces,
 * whitespace collapses, at most `max` characters. Plain text only; the web renders it as text.
 */
export function cleanText(value: string, max: number): string {
  return cut(stripControlChars(value).replace(/\s+/g, ' ').trim(), max);
}

/**
 * Text of a code block: line breaks and tabs stay, other control characters become spaces, CRLF
 * becomes LF, trailing spaces and blank edges go; at most `max` characters.
 */
export function cleanCode(value: string, max: number): string {
  let kept = '';
  const normalized = value.replace(/\r\n?/g, LINE_FEED);
  for (const char of normalized) {
    kept += char === LINE_FEED || char === TAB ? char : stripControlChars(char);
  }
  const lines = kept.split(LINE_FEED).map((line) => line.trimEnd());
  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines.at(-1) === '') lines.pop();
  const joined = lines.join(LINE_FEED);
  return joined.length <= max ? joined : `${joined.slice(0, max - 1)}${ELLIPSIS}`;
}

/** Words of a text (runs of non-space characters). */
export function countWords(value: string): number {
  const words = value.trim().split(/\s+/);
  return words[0] === '' ? 0 : words.length;
}

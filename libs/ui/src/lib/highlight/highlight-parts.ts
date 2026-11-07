import { HIGHLIGHT_MAX_TERMS } from './models/highlight-max-terms.const';
import type { HighlightPart } from './models/highlight-part.interface';

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const WHITESPACE = /\s+/u;

/** Query terms: a string is split on whitespace, an array is used as given; blanks are dropped. */
export function queryTerms(query: string | readonly string[]): string[] {
  const raw = typeof query === 'string' ? query.split(WHITESPACE) : query;
  const terms = raw.map((term) => term.trim()).filter((term) => term.length > 0);
  return [...new Set(terms)].slice(0, HIGHLIGHT_MAX_TERMS);
}

/**
 * Splits `text` into plain and matching runs. Terms match case-insensitively and literally
 * (regex characters are escaped); overlapping and touching matches become one run.
 */
export function highlightParts(
  text: string,
  query: string | readonly string[],
): readonly HighlightPart[] {
  if (text === '') {
    return [];
  }
  const ranges: [number, number][] = [];
  for (const term of queryTerms(query)) {
    const pattern = new RegExp(term.replace(REGEX_SPECIAL, '\\$&'), 'giu');
    for (const match of text.matchAll(pattern)) {
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  if (ranges.length === 0) {
    return [{ text, match: false }];
  }
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }
  const parts: HighlightPart[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), match: false });
    }
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), match: false });
  }
  return parts;
}

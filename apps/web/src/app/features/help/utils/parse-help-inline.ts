import { HELP_INLINE } from '../models/help-inline-kind.const';
import type { HelpInlineKind } from '../models/help-inline-kind.type';
import type { HelpInlineSegment } from '../models/help-inline-segment.interface';

const MARKER = /\*\*(.+?)\*\*|`(.+?)`/g;

/**
 * Splits an article text into runs so the template can draw control names and key caps without
 * `innerHTML`: `**bold**` becomes a `ui` run and `` `code` `` a `key` run.
 */
export function parseHelpInline(text: string): readonly HelpInlineSegment[] {
  const segments: HelpInlineSegment[] = [];
  let last = 0;
  const push = (kind: HelpInlineKind, value: string): void => {
    if (value !== '') {
      segments.push({ kind, text: value });
    }
  };
  for (const match of text.matchAll(MARKER)) {
    push(HELP_INLINE.Plain, text.slice(last, match.index));
    if (match[1] !== undefined) {
      push(HELP_INLINE.Ui, match[1]);
    } else {
      push(HELP_INLINE.Key, match[2] ?? '');
    }
    last = match.index + match[0].length;
  }
  push(HELP_INLINE.Plain, text.slice(last));
  return segments;
}

/** The text without its markers (for search and snippets). */
export function stripHelpInline(text: string): string {
  return parseHelpInline(text)
    .map((segment) => segment.text)
    .join('');
}

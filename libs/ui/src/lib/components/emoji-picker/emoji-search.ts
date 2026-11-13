import type { EmojiPickerCategory } from './models/emoji-picker-category.interface';
import type { EmojiPickerItem } from './models/emoji-picker-item.interface';

/** A pictographic or a regional indicator: the text holds an emoji. */
const EMOJI_CHARACTER = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
/** Combining marks, removed so "cafe" finds "café". */
const MARKS = /\p{M}/gu;

/** Lower case without accents, for comparing search words. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(MARKS, '').toLowerCase().trim();
}

/** The text when it is exactly one emoji (one grapheme with an emoji in it), else `null`. */
export function loneEmoji(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === '' || !EMOJI_CHARACTER.test(trimmed)) {
    return null;
  }
  const graphemes = [
    ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed),
  ];
  return graphemes.length === 1 ? trimmed : null;
}

/** Every word of the query starts a word of the item's name or keywords. */
function matches(item: EmojiPickerItem, terms: readonly string[]): boolean {
  const words = normalizeSearch([item.name, ...(item.keywords ?? [])].join(' ')).split(
    /[\s,.:-]+/u,
  );
  return terms.every((term) => words.some((word) => word.startsWith(term)));
}

/**
 * The emoji whose name or keywords match every word of `query` (word starts, ignoring case and
 * accents), each once, in catalogue order. A query that is itself one emoji comes first, so a
 * pasted emoji can be chosen even when the catalogue lacks it.
 */
export function searchEmoji(
  categories: readonly EmojiPickerCategory[],
  query: string,
  extra: readonly EmojiPickerItem[] = [],
): EmojiPickerItem[] {
  const terms = normalizeSearch(query).split(/\s+/u).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }
  const found = new Map<string, EmojiPickerItem>();
  const pasted = loneEmoji(query);
  if (pasted !== null) {
    const known = [...extra, ...categories.flatMap((category) => category.items)].find(
      (item) => item.emoji === pasted,
    );
    found.set(pasted, known ?? { emoji: pasted, name: pasted });
  }
  for (const item of categories.flatMap((category) => category.items)) {
    if (!found.has(item.emoji) && matches(item, terms)) {
      found.set(item.emoji, item);
    }
  }
  return [...found.values()];
}

/** `items` in rows of `columns`. */
export function emojiRows<T>(items: readonly T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let start = 0; start < items.length; start += columns) {
    rows.push(items.slice(start, start + columns));
  }
  return rows;
}

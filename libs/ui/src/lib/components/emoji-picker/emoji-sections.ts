import { emojiRows, searchEmoji } from './emoji-search';
import { EMOJI_PICKER_COLUMNS } from './models/emoji-picker-columns.const';
import type { EmojiPickerCategory } from './models/emoji-picker-category.interface';
import type { EmojiPickerItem } from './models/emoji-picker-item.interface';
import type { EmojiPickerSection } from './models/emoji-picker-section.interface';

/** A headed grid of `items` in rows; its heading id is `<idPrefix>-<key>`. */
export function emojiSection(
  idPrefix: string,
  key: string,
  label: string,
  items: readonly EmojiPickerItem[],
  removable = false,
): EmojiPickerSection {
  return {
    headingId: `${idPrefix}-${key}`,
    label,
    rows: emojiRows(items, EMOJI_PICKER_COLUMNS),
    removable,
  };
}

/**
 * What one category tab shows: "Recent", "Yours" (removable), then the category, each only while
 * it has emoji. Heading ids carry the category id, so they stay unique per tab panel.
 */
export function categorySections(
  idPrefix: string,
  category: EmojiPickerCategory,
  recent: { readonly label: string; readonly items: readonly EmojiPickerItem[] },
  own: { readonly label: string; readonly items: readonly EmojiPickerItem[] },
): EmojiPickerSection[] {
  return [
    emojiSection(idPrefix, `${category.id}-recent`, recent.label, recent.items),
    emojiSection(idPrefix, `${category.id}-own`, own.label, own.items, true),
    emojiSection(idPrefix, category.id, category.label, category.items),
  ].filter((section) => section.rows.length > 0);
}

/** The one "Results" grid of a search (`searchEmoji`; own emoji are found by their glyph). */
export function resultsSection(
  idPrefix: string,
  label: string,
  categories: readonly EmojiPickerCategory[],
  query: string,
  own: readonly EmojiPickerItem[],
): EmojiPickerSection {
  return emojiSection(idPrefix, 'results', label, searchEmoji(categories, query, own));
}

/** The tab to show: the previous one while it still exists, else the first. */
export function keptCategory(
  categories: readonly EmojiPickerCategory[],
  previous: string | undefined,
): string | undefined {
  return categories.some((item) => item.id === previous) ? previous : categories[0]?.id;
}

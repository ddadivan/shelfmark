/** One emoji of `ui-emoji-picker`. Every string comes in translated. */
export interface EmojiPickerItem {
  /** The emoji itself (one grapheme). */
  readonly emoji: string;
  /** Its accessible name in the active language ("pizza"); also searched. */
  readonly name: string;
  /** More words the search matches ("cheese", "slice"). */
  readonly keywords?: readonly string[];
  /**
   * The translated remove action ("Remove 🦩"): set on an own emoji the person may forget; the
   * picker then shows the "×" and emits `removed` (pointer, Delete or Backspace).
   */
  readonly removeLabel?: string;
}

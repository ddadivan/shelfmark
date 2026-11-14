import type { EmojiPickerItem } from './emoji-picker-item.interface';

/** A tab of `ui-emoji-picker` (food, travel, ...): its emoji in the order shown. */
export interface EmojiPickerCategory {
  /** Stable id (the tab value). */
  readonly id: string;
  /** Translated tab name ("Food"), the tab's accessible name and the grid heading. */
  readonly label: string;
  readonly items: readonly EmojiPickerItem[];
}

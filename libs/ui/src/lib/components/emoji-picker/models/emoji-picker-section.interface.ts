import type { EmojiPickerItem } from './emoji-picker-item.interface';

/** One headed grid inside the panel ("Recent", "Yours", a category, search results). */
export interface EmojiPickerSection {
  /** Id of the heading that names the grid. */
  readonly headingId: string;
  readonly label: string;
  /** The emoji in rows of `EMOJI_PICKER_COLUMNS` (the last row may be shorter). */
  readonly rows: readonly (readonly EmojiPickerItem[])[];
  /** Items with a `removeLabel` can be removed here ("Yours"). */
  readonly removable: boolean;
}

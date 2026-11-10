import type { IconName } from '@shelfmark/ui';

/** How one key is drawn on the platform at hand. */
export interface KeyCap {
  /** A modifier glyph drawn as an icon (the fonts have no command, option or shift sign). */
  icon: IconName | null;
  /** A symbol or letter shown as is. */
  text: string | null;
  /** Translation key of the spoken name; it is the visible word when there is no icon or text. */
  nameKey: string | null;
}

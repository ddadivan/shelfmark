import type { ReaderFont, ReaderLineSpacing, ReaderLineWidth, ReaderTheme } from '@shelfmark/ui';

/** Reading settings of Reader (the Link page's Aa), kept on the account (`ReaderPreferences`). */
export interface ReaderSettings {
  /** A fixed page palette, or `null` until the person picks one (Reader follows the app). */
  theme: ReaderTheme | null;
  font: ReaderFont;
  /** Body text size in px, 14 to 24 in 1px steps. */
  size: number;
  lineSpacing: ReaderLineSpacing;
  width: ReaderLineWidth;
}

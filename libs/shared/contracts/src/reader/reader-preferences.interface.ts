import type { ReaderPageTheme } from './reader-page-theme.type';
import type { ReaderTextFont } from './reader-text-font.type';
import type { ReaderTextMeasure } from './reader-text-measure.type';
import type { ReaderTextSpacing } from './reader-text-spacing.type';

/**
 * Reading settings of Reader (the Link page's Aa), part of `UserSettingsResponse`, so they follow
 * the user to every device. The first write of any of them marks them saved (`readerSaved`).
 */
export interface ReaderPreferences {
  /** A fixed page palette, or `null` (default): Reader follows the app theme. */
  readerTheme: ReaderPageTheme | null;
  /** Default `sans`. */
  readerFont: ReaderTextFont;
  /** Body text size in px, `READER_TEXT_SIZE_RANGE` (whole numbers). Default 18. */
  readerSize: number;
  /** Default `normal`. */
  readerLineSpacing: ReaderTextSpacing;
  /** Default `normal`. */
  readerLineWidth: ReaderTextMeasure;
}

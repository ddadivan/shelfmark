import { READER_TEXT_FONT } from './reader-text-font.const';
import { READER_TEXT_MEASURE } from './reader-text-measure.const';
import { READER_TEXT_SIZE_RANGE } from './reader-text-size-range.const';
import { READER_TEXT_SPACING } from './reader-text-spacing.const';
import type { ReaderPreferences } from './reader-preferences.interface';

/** What a new account has: like the app, Sans, 18px, Normal spacing, Normal width. */
export const READER_PREFERENCES_DEFAULT: Readonly<ReaderPreferences> = {
  readerTheme: null,
  readerFont: READER_TEXT_FONT.Sans,
  readerSize: READER_TEXT_SIZE_RANGE.Default,
  readerLineSpacing: READER_TEXT_SPACING.Normal,
  readerLineWidth: READER_TEXT_MEASURE.Normal,
};

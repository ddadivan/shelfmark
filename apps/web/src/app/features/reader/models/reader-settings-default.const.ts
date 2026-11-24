import {
  READER_FONT,
  READER_LINE_SPACING,
  READER_LINE_WIDTH,
  READER_TEXT_SIZE,
} from '@shelfmark/ui';
import type { ReaderSettings } from './reader-settings.interface';

/** Like the app, Sans, 18px, Normal spacing, Normal width (the design's defaults; Reset). */
export const READER_SETTINGS_DEFAULT: Readonly<ReaderSettings> = {
  theme: null,
  font: READER_FONT.Sans,
  size: READER_TEXT_SIZE.Default,
  lineSpacing: READER_LINE_SPACING.Normal,
  width: READER_LINE_WIDTH.Normal,
};

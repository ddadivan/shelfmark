import { READER_FONT, READER_LINE_WIDTH, READER_TEXT_SIZE, READER_TONE } from '@shelfmark/ui';
import type { ReaderSettings } from './reader-settings.interface';

/** M, Sans, Narrow, like the app (the design's defaults). */
export const READER_SETTINGS_DEFAULT: Readonly<ReaderSettings> = {
  size: READER_TEXT_SIZE.M,
  font: READER_FONT.Sans,
  width: READER_LINE_WIDTH.Narrow,
  tone: READER_TONE.App,
};

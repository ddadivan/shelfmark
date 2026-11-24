import type { READER_TEXT_SPACING } from './reader-text-spacing.const';

/** One of `READER_TEXT_SPACING`. */
export type ReaderTextSpacing = (typeof READER_TEXT_SPACING)[keyof typeof READER_TEXT_SPACING];

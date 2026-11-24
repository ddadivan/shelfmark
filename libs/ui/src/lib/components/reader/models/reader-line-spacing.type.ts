import type { READER_LINE_SPACING } from './reader-line-spacing.const';

/** One of `READER_LINE_SPACING`. */
export type ReaderLineSpacing = (typeof READER_LINE_SPACING)[keyof typeof READER_LINE_SPACING];

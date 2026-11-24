import type { READER_TEXT_FONT } from './reader-text-font.const';

/** One of `READER_TEXT_FONT`. */
export type ReaderTextFont = (typeof READER_TEXT_FONT)[keyof typeof READER_TEXT_FONT];

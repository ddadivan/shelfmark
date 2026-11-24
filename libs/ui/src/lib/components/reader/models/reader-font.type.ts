import type { READER_FONT } from './reader-font.const';

/** One of `READER_FONT`. */
export type ReaderFont = (typeof READER_FONT)[keyof typeof READER_FONT];

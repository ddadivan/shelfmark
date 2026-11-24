import type { READER_TEXT_SIZE } from './reader-text-size.const';

/** One of `READER_TEXT_SIZE`. */
export type ReaderTextSize = (typeof READER_TEXT_SIZE)[keyof typeof READER_TEXT_SIZE];

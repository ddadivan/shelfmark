import type { READER_LINE_WIDTH } from './reader-line-width.const';

/** One of `READER_LINE_WIDTH`. */
export type ReaderLineWidth = (typeof READER_LINE_WIDTH)[keyof typeof READER_LINE_WIDTH];

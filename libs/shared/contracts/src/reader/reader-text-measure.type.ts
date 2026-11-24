import type { READER_TEXT_MEASURE } from './reader-text-measure.const';

/** One of `READER_TEXT_MEASURE`. */
export type ReaderTextMeasure = (typeof READER_TEXT_MEASURE)[keyof typeof READER_TEXT_MEASURE];

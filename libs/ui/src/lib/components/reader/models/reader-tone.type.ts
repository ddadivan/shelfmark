import type { READER_TONE } from './reader-tone.const';

/** One of `READER_TONE`. */
export type ReaderTone = (typeof READER_TONE)[keyof typeof READER_TONE];

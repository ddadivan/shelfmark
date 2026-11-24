import type { READER_VIEW_BLOCK } from './reader-block-kind.const';

/** One of `READER_VIEW_BLOCK`. */
export type ReaderViewBlockKind = (typeof READER_VIEW_BLOCK)[keyof typeof READER_VIEW_BLOCK];

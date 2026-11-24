import type { READER_BLOCK_KIND } from './reader-block-kind.const';

/** One of `READER_BLOCK_KIND`. */
export type ReaderBlockKind = (typeof READER_BLOCK_KIND)[keyof typeof READER_BLOCK_KIND];

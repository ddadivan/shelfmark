import type { READER_THEME } from './reader-theme.const';

/** One of `READER_THEME`. */
export type ReaderTheme = (typeof READER_THEME)[keyof typeof READER_THEME];

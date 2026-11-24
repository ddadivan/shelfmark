import type { READER_PAGE_THEME } from './reader-page-theme.const';

/** One of `READER_PAGE_THEME`. */
export type ReaderPageTheme = (typeof READER_PAGE_THEME)[keyof typeof READER_PAGE_THEME];

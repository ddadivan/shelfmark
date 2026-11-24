/**
 * How far a link's Reader text has been read (the "Continue reading" group of Revisit), kept per
 * user and link (`READER_ENDPOINT.Progress`); cleared when the link gets a new URL.
 */
export interface ReaderProgress {
  linkId: string;
  /** Share read, 0 to 1: the last scroll position. */
  fraction: number;
  /** Minutes left at the article's reading speed. */
  minutesLeft: number;
  /** ISO time of the last stored scroll (the server's clock). */
  updatedAt: string;
}

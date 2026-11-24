/** How far a link's Reader text has been read (the "Continue reading" group of Revisit). */
export interface ReaderProgress {
  linkId: string;
  /** Share read, 0 to 1. */
  fraction: number;
  /** Minutes left at the article's reading speed. */
  minutesLeft: number;
  /** ISO time of the last scroll in Reader. */
  updatedAt: string;
}

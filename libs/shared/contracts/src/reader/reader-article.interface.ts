import type { ReaderBlock } from './reader-block.interface';

/** The readable text of a saved link's page (Reader mode of the Link page). */
export interface ReaderArticle {
  /** The article's own title (may differ from the link title). */
  title: string;
  /** Author or byline as the page names it; `null` when unknown. */
  author: string | null;
  /** ISO date the page says it was published; `null` when unknown. */
  publishedAt: string | null;
  /** Estimated reading time in whole minutes, at least 1. */
  minutes: number;
  blocks: ReaderBlock[];
}

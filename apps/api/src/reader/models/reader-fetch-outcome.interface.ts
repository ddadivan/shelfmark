import type { ReaderArticle } from '@shelfmark/contracts';

/** What one Reader page fetch gave: an article, a page without one, or a failure to retry later. */
export interface ReaderFetchOutcome {
  article: ReaderArticle | null;
  failed: boolean;
}

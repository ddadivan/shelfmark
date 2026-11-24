import type { ReaderArticle } from './reader-article.interface';

/**
 * `GET /api/links/:id/reader` (`READER_ENDPOINT.Article`). `article` is `null` when the page has
 * no article text (a shop, a video, an app), could not be read, or Settings › Library › Fetch
 * previews is off: Reader then shows the link's own picture, summary and note.
 */
export interface ReaderArticleResponse {
  article: ReaderArticle | null;
}

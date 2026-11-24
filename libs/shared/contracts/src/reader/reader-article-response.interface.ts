import type { ReaderArticle } from './reader-article.interface';

/**
 * `GET /api/links/:id/reader` (planned, `READER_ENDPOINT.Article`). `article` is `null` when the
 * page has no article text (a shop, a video, an app) or the text could not be extracted: Reader
 * then shows the link's own picture, summary and note.
 */
export interface ReaderArticleResponse {
  article: ReaderArticle | null;
}

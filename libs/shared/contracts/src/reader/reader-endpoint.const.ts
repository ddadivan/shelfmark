/**
 * Reader endpoints. The text is extracted on the server behind the SSRF-safe fetcher (PROJECT.md
 * 5.8), stored per link and sent as typed blocks, never HTML.
 */
export const READER_ENDPOINT = {
  /** `GET`: `ReaderArticleResponse` of the session user's own live link (404 otherwise). */
  Article: '/api/links/:id/reader',
  /** `GET`: `ReaderProgress[]`, started and unfinished texts, the most recent first. */
  Progress: '/api/reader/progress',
  /** `GET` (`ReaderProgressResponse`) and `PUT` (`ReaderProgressRequest`, 204) for one link. */
  LinkProgress: '/api/reader/progress/:linkId',
} as const;

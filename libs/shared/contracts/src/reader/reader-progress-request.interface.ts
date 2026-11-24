/**
 * `PUT /api/reader/progress/:linkId` (`READER_ENDPOINT.LinkProgress`): how far the Reader text of
 * one of your live links was read. Answers 204; the server stamps the time.
 */
export interface ReaderProgressRequest {
  /** Share read, the last scroll position: 0 to 1. */
  fraction: number;
  /** Whole minutes left at the article's reading speed, 0 to `READER_LIMIT.MinutesLeftMax`. */
  minutesLeft: number;
}

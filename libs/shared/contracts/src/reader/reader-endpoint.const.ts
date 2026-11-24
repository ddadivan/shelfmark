/**
 * Reader endpoints (planned, not implemented by `apps/api` yet): the text is extracted on the
 * server behind the SSRF-safe fetcher (PROJECT.md 5.8) and sent as typed blocks. Until then the
 * web app's `READER_API` HTTP seam answers "no article" without a request.
 */
export const READER_ENDPOINT = {
  Article: '/api/links/:id/reader',
  Progress: '/api/reader/progress',
} as const;

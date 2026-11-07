/** The arguments `SessionAuthGuard` passes to `getSession` (as seen by the guard spec). */
export interface SessionArgs {
  headers: Headers;
  query: unknown;
}

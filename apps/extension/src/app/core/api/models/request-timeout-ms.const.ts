/**
 * How long the popup waits for a Shelfmark answer before it shows "Couldn't reach Shelfmark" with
 * Try again (#467). A cold start of the API and the database takes a few seconds; without a limit
 * a server that never answers would keep the spinner until the platform cut the request.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

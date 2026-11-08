/**
 * Handler time limit. Below the Vercel `maxDuration` of 10 s (`vercel.json`), so the client gets a
 * clean 504 `ApiError` instead of the platform's own timeout page. Includes preview fetching.
 */
export const REQUEST_TIMEOUT_MS = 8_000;

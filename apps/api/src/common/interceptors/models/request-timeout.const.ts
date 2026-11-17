/**
 * Handler time limit. Well below the Vercel `maxDuration` (`vercel.json`, 30 s since ADR 0048, which
 * leaves the rest to AI work deferred with `waitUntil`), so the client gets a clean 504 `ApiError`
 * instead of the platform's own timeout page. Includes preview fetching. Kept at 8 s (ADR 0031).
 */
export const REQUEST_TIMEOUT_MS = 8_000;

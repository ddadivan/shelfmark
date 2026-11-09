const MINUTE_MS = 60_000;

/**
 * A lazy re-capture (ADR 0027 note, #189) of one link is claimed at most once per this time. The
 * claim is the persisted `links.capture_attempted_at`, so it holds across serverless instances.
 */
export const RECAPTURE_COOLDOWN_MS = 60 * MINUTE_MS;

/** Page fetch budget when the link has no stored source hints (the preview needs a page load). */
export const RECAPTURE_PAGE_FETCH_MS = 3_000;

/**
 * Time of the request kept free for loading and mapping the link and sending the response after
 * the capture (the capture itself already races its own deadline).
 */
export const RECAPTURE_RESPONSE_MARGIN_MS = 1_500;

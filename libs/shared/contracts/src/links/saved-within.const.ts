/**
 * How recently a link was saved (`GET /api/links?saved=`, the library's Filter › Saved): the last
 * 7 days or the last 30 days, counted back from the request. No value means any time.
 */
export const SAVED_WITHIN = {
  Week: 'week',
  Month: 'month',
} as const;

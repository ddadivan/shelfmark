/**
 * Why a job did not produce a result. Only `quota` (limit line) and `unavailable` ("not available
 * right now" with Try again) are shown to the user; the others collapse the AI rows silently.
 */
export const AI_JOB_REASON = {
  Off: 'off',
  Quota: 'quota',
  Unavailable: 'unavailable',
  Rejected: 'rejected',
  NothingFound: 'nothing-found',
} as const;

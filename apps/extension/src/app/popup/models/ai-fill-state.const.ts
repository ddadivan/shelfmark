/**
 * Where "Fill in with AI" stands in the popup: not asked, asking (the button is busy), the
 * suggestions are applied, the monthly limit line, the "not available" line, or nothing to show
 * (too slow, nothing found, rejected: the popup looks as it did before).
 */
export const AI_FILL_STATE = {
  Idle: 'idle',
  Loading: 'loading',
  Ready: 'ready',
  Quota: 'quota',
  Unavailable: 'unavailable',
  Hidden: 'hidden',
} as const;

/**
 * Where the draft suggestions of Add link stand (`AiDraftService`): nothing asked yet, asking
 * (skeleton chips), ready (chips, or nothing when nothing fits), the monthly limit line, the
 * "not available right now" line, or hidden (AI off, rejected, too slow: the rows collapse).
 */
export const AI_DRAFT_STATE = {
  Idle: 'idle',
  Loading: 'loading',
  Ready: 'ready',
  Quota: 'quota',
  Unavailable: 'unavailable',
  Hidden: 'hidden',
} as const;

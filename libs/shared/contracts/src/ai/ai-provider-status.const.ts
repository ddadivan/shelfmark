/**
 * Whether AI answers for the user right now. `unavailable` shows the "AI isn't responding" notice in
 * Settings › AI only; links save as usual.
 */
export const AI_PROVIDER_STATUS = {
  Ok: 'ok',
  Unavailable: 'unavailable',
} as const;

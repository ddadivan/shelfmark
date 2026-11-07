/** States of a reveal: visible without motion, hidden until it scrolls in, then shown. */
export const LANDING_REVEAL_STATE = {
  Idle: 'idle',
  Pending: 'pending',
  Shown: 'shown',
} as const;

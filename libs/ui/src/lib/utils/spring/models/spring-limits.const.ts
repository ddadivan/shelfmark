/** Integration limits of `stepSpring`. */
export const SPRING_LIMITS = {
  /** Longest integration substep (ms): 120 steps per second keep a stiff spring stable. */
  MaxSubstepMs: 1000 / 120,
  /** A longer frame gap (a background tab) counts as this long (ms). */
  MaxFrameMs: 64,
  /** Below this offset and velocity the spring is at rest. */
  RestEpsilon: 0.01,
} as const;

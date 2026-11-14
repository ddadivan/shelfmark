/**
 * How a scene moves, chosen by where it is shown:
 * `loop` slow 3-5 s cycle (landing, welcome steps, sign-in), `once` plays on appearance and
 * holds the final frame (empty states, errors), `none` is the static final frame.
 * Under `prefers-reduced-motion` every scene is static whatever the mode.
 */
export const ILLUSTRATION_MOTION = {
  Loop: 'loop',
  Once: 'once',
  None: 'none',
} as const;

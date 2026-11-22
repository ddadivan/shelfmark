/** Tuning of the drag preview wobble (Motion «Drag a link», «Drop a link on a folder»). */
export const DRAG_WOBBLE = {
  /** Degrees of tilt per px/ms of horizontal pointer velocity. */
  TiltPerVelocity: 6,
  /** The tilt never leans further than this, either way (degrees). */
  MaxTilt: 10,
  /** Squash per px/ms of vertical pointer velocity. */
  SquashPerVelocity: 0.03,
  /** The most a fast vertical move squashes the preview (4%). */
  MaxSquash: 0.04,
  /** Time constant of the velocity smoothing (ms). */
  VelocitySmoothingMs: 50,
  /** A pointer that rests longer than this starts losing its velocity (ms). */
  VelocityIdleMs: 32,
  /** The scale the preview shrinks to as it flies into a folder. */
  FlyScale: 0.2,
} as const;

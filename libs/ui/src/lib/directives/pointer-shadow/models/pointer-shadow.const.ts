/** The farthest the card shadow shifts from its resting place, in CSS px (a few, never more). */
export const POINTER_SHADOW_MAX_OFFSET_PX = 6;

/** The custom properties the directive writes (the card's hover shadow reads them). */
export const POINTER_SHADOW_PROPERTY = {
  X: '--shadow-x',
  Y: '--shadow-y',
} as const;

/** Only a precise pointer that can hover moves the shadow; touch and coarse pointers do not. */
export const POINTER_SHADOW_FINE_QUERY = '(hover: hover) and (pointer: fine)';

export const POINTER_SHADOW_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

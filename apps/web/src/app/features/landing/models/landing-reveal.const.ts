/** Scroll-reveal spec (16-landing); duration and easing live in the `landing.reveal` mixin. */
export const LANDING_REVEAL = {
  /** Share of a block that must be on screen before it reveals. */
  Threshold: 0.12,
  /** Delay between two children of a revealed block. */
  StaggerMs: 90,
} as const;

/** Scroll-reveal spec (PROJECT.md story 20); duration and easing come from the Motion tokens in CSS. */
export const LANDING_REVEAL = {
  /** Share of a section that must be on screen before it reveals. */
  Threshold: 0.2,
  /** Delay between two children of a revealed section. */
  StaggerMs: 60,
} as const;

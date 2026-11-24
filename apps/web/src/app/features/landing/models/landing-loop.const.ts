/** Timing of the landing's app preview (16-landing). */
export const LANDING_LOOP = {
  /** One frame of the cycle (All links, Videos, Shopping, Favorites, Watch later). */
  PreviewStepMs: 3600,
  /** After a click on a row or a tab the cycle waits this long before it moves on. */
  PreviewResumeMs: 6000,
  /** The toast slides in this long after the page shows the preview. */
  PreviewToastMs: 1500,
  /** Back on All links › All the toast returns after this pause. */
  PreviewToastAgainMs: 700,
  /** The fade of the fallback where View Transitions are missing. */
  PreviewFadeMs: 260,
} as const;

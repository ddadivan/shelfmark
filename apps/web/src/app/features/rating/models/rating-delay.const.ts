/** Timing of the rating dialog, in milliseconds. */
export const RATING_DELAY = {
  /** Wait after the app is ready before the first look at the prompt (PROJECT.md story 24). */
  Show: 5000,
  /** Wait before asking again when another dialog, a focused field or a hidden tab was in the way. */
  Retry: 5000,
  /** The thank-you step closes by itself after this. */
  ThanksClose: 4000,
} as const;

/** Timing of the one-time AI announcement dialog, in milliseconds (like "What's new"). */
export const AI_ANNOUNCEMENT_DELAY = {
  /** Wait after the shell is up, so the first screen settles. */
  Show: 2000,
  /** Wait before trying again while another dialog, a focused field or a hidden tab is in the way. */
  Retry: 5000,
} as const;

/** Timing of the automatic "What's new" dialog, in milliseconds. */
export const WHATS_NEW_DELAY = {
  /** Wait after the shell is up before the first try, so the first screen settles. */
  Show: 1500,
  /** Wait before trying again while another dialog, a focused field or a hidden tab is in the way. */
  Retry: 5000,
} as const;

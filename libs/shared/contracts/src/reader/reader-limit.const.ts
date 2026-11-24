/** Limits of Reader data. */
export const READER_LIMIT = {
  /** At most this many links in "Continue reading". */
  ContinueMax: 5,
  /** A text counts as started from this share read... */
  StartedFraction: 0.05,
  /** ...and as finished from this one (it leaves "Continue reading"). */
  DoneFraction: 0.95,
  /** Highest `minutesLeft` a progress write may carry. */
  MinutesLeftMax: 999,
} as const;

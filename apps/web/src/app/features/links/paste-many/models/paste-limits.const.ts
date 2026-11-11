/**
 * Limits of reading a paste: at most `SkippedMax` non-link lines are listed, each cut to
 * `SkippedLength` characters; a paste longer than `TextMax` characters is read only up to there.
 */
export const PASTE_LIMIT = {
  SkippedMax: 20,
  SkippedLength: 80,
  TextMax: 500_000,
} as const;

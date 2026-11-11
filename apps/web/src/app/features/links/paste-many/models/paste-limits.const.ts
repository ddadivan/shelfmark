/**
 * Limits of reading a paste: at most `SkippedMax` non-link lines are listed, each cut to
 * `SkippedLength` characters; a paste longer than `TextMax` characters is read only up to there.
 * The list loads at most `PreviewConcurrency` row previews at a time (the preview endpoint has its
 * own rate limit).
 */
export const PASTE_LIMIT = {
  SkippedMax: 20,
  SkippedLength: 80,
  TextMax: 500_000,
  PreviewConcurrency: 3,
} as const;

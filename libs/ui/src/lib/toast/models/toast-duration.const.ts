/**
 * How long a toast stays (ms). `Quick` is a plain confirmation, `Status` a status line, `Saved` a
 * saved link, `Undo` anything with an Undo (the countdown line runs for it), `Sticky` (0) stays
 * until it is handled. Hover, focus or touch pauses all of them.
 */
export const TOAST_DURATION_MS = {
  Quick: 3000,
  Status: 4000,
  Saved: 5000,
  Undo: 8000,
  Sticky: 0,
} as const;

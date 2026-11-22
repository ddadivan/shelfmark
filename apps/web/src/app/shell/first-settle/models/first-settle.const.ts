/** The one-time settle of the main column on the first page of an app load (#562, Motion). */
export const FIRST_SETTLE = {
  /** On `.shell__main` while the first page settles (`styles.scss`). */
  Class: 'shell__main--settle',
  /** The class goes this long after the first page appeared (6 steps of 60 ms + 200 ms, ms). */
  HoldMs: 700,
  /** Without a page by then, the class goes anyway (ms). */
  MaxMs: 3000,
} as const;

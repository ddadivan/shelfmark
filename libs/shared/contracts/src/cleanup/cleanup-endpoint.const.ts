/** Library clean-up routes (F5, ADR 0053). */
export const CLEANUP_ENDPOINT = {
  /** `GET` the stored report, read live. */
  Report: '/api/cleanup',
  /** `POST` a new run (409 while one runs). */
  Run: '/api/cleanup/run',
  /** `POST` applies the selected rows in one step. */
  Apply: '/api/cleanup/apply',
  /** `POST` reverts a run with the `undo` payload of its apply response. */
  Undo: '/api/cleanup/undo',
  /** `GET` the entry card counts. */
  Summary: '/api/cleanup/summary',
  /** `POST` hides the entry card for `CLEANUP_LIMIT.CardIntervalDays` (204). */
  DismissCard: '/api/cleanup/card/dismiss',
} as const;

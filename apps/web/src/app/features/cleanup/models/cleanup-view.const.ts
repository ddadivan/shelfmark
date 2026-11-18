/** What the clean-up page shows (derived from the report by `CleanupReportStore`). */
export const CLEANUP_VIEW = {
  /** The first read is under way. */
  Loading: 'loading',
  /** The report could not be read. */
  Error: 'error',
  /** No run yet: the lead and "Check my library". */
  Never: 'never',
  /** The deferred AI checks are running. */
  Checking: 'checking',
  /** Rows to review. */
  Report: 'report',
  /** A finished run found nothing: "Your library is tidy". */
  Tidy: 'tidy',
  /** The check failed before it found anything: "The check didn't finish" and "Try again". */
  Failed: 'failed',
  /** The report was applied: the done state and "Check again". */
  Applied: 'applied',
} as const;

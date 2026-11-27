/** Options of `UndoToastService.retry()`; texts are already translated. */
export interface RetryToastOptions {
  /** What failed ("Move failed"). */
  readonly title: string;
  /** What it failed for, on a second line. */
  readonly detail?: string;
  /** The user pressed Retry. */
  readonly onRetry: () => void;
}

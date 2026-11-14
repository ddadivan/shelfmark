export interface ToastAction {
  /** Button text, already translated ("Undo", "Retry"). */
  readonly label: string;
  /** Runs on activation; the toast is dismissed afterwards. */
  readonly run: () => void;
}

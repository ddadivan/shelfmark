/** What `ui-command-list` emits when an item is chosen. */
export interface CommandSelection {
  /** The `value` of the chosen `ui-command-item`. */
  readonly value: string;
  /** Ctrl or Cmd was held (Ctrl/Cmd+Enter, Ctrl/Cmd+click): open without leaving the list. */
  readonly background: boolean;
}

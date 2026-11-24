/** Options of `DialogService.confirm()`. Every string comes from the caller (translated). */
export interface ConfirmDialogConfig {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  /** Accessible name of the close button in the header; without it there is no close button. */
  readonly closeLabel?: string;
  /** Irreversible action: red confirm button, `alertdialog`, scrim does not close, Cancel has focus. */
  readonly destructive?: boolean;
  /**
   * Cancel takes focus without the destructive styling (a "Stay or leave?" question where staying
   * is the safe answer). Esc and the scrim still answer `false`.
   */
  readonly focusCancel?: boolean;
}

export interface PopoverCloseOptions {
  /**
   * Give focus back to the trigger. By default only when focus is inside the popover, so a
   * popover opened by hover never moves focus when it closes.
   */
  readonly restoreFocus?: boolean;
}

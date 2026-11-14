/** Areas of `ui-dialog` that `UiDialogHarness.getChildLoader()` takes (selectors). */
export const DIALOG_HARNESS_SLOT = {
  /** Header buttons left of the close button (`slot="actions"`). */
  Actions: '.ui-dialog__head-end',
  Body: '.ui-dialog__body',
  /** Footer buttons (`slot="footer"`). */
  Footer: '.ui-dialog__foot',
} as const;

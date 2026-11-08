/**
 * The container of a dialog that has a title (`aria-labelledby`, set by `ui-dialog`). The delete
 * folder dialog is scanned through it so that a container still leaving the DOM, which has no
 * title, is not scanned.
 */
export const TITLED_DIALOG_SELECTOR = '.cdk-dialog-container[aria-labelledby]';

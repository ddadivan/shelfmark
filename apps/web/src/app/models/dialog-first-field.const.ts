/**
 * `autoFocus` selector of a form dialog: the first text field gets focus on open, so typing can
 * start at once (the default, the first tabbable element, is the close button in the header).
 */
export const DIALOG_FIRST_FIELD = 'input:not([type="hidden"])';

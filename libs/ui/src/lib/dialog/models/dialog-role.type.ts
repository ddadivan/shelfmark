import type { DIALOG_ROLE } from './dialog-role.const';

/** ARIA role of the dialog; destructive confirmations use `alertdialog`. */
export type DialogRole = (typeof DIALOG_ROLE)[keyof typeof DIALOG_ROLE];

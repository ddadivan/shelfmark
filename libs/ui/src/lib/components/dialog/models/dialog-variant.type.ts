import type { DIALOG_VARIANT } from './dialog-variant.const';

/** Look of a dialog: `default` or `command` (top-placed glass panel, visually hidden title). */
export type DialogVariant = (typeof DIALOG_VARIANT)[keyof typeof DIALOG_VARIANT];

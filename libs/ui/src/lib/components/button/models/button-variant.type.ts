import type { BUTTON_VARIANT } from './button-variant.const';

/** Visual weight of a button. One `primary` per view; `danger` only for irreversible actions. */
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

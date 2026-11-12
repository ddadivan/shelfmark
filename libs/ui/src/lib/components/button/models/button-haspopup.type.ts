import type { BUTTON_HASPOPUP } from './button-haspopup.const';

/** Value of `aria-haspopup` on the inner control. */
export type ButtonHaspopup = boolean | (typeof BUTTON_HASPOPUP)[keyof typeof BUTTON_HASPOPUP];

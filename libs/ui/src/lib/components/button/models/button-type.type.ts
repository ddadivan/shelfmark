import type { BUTTON_TYPE } from './button-type.const';

/** Native `type` of the inner `<button>`. */
export type ButtonType = (typeof BUTTON_TYPE)[keyof typeof BUTTON_TYPE];

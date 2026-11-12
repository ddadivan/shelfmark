import type { BUTTON_SIZE } from './button-size.const';

/** Button height: 30px, 36px or 44px (as rem). */
export type ButtonSize = (typeof BUTTON_SIZE)[keyof typeof BUTTON_SIZE];

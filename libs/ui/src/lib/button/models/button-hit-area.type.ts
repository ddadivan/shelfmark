import type { BUTTON_HIT_AREA } from './button-hit-area.const';

/** How the touch target is enlarged: the button grows, or an invisible overlay is added. */
export type ButtonHitArea = (typeof BUTTON_HIT_AREA)[keyof typeof BUTTON_HIT_AREA];

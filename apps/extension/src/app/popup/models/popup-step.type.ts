import type { POPUP_STEP } from './popup-step.const';

export type PopupStep = (typeof POPUP_STEP)[keyof typeof POPUP_STEP];

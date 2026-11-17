import type { POPUP_ERROR } from './popup-error.const';

export type PopupError = (typeof POPUP_ERROR)[keyof typeof POPUP_ERROR];

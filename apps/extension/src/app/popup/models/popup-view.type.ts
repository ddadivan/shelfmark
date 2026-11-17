import type { POPUP_VIEW } from './popup-view.const';

export type PopupView = (typeof POPUP_VIEW)[keyof typeof POPUP_VIEW];

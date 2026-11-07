import type { UI_VIEW } from './ui-view.const';

export type UiView = (typeof UI_VIEW)[keyof typeof UI_VIEW];

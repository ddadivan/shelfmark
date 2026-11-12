import type { SELECT_ICON } from './select-icon.const';

export type SelectIcon = (typeof SELECT_ICON)[keyof typeof SELECT_ICON];

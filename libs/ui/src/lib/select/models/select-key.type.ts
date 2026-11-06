import type { SELECT_KEY } from './select-key.const';

export type SelectKey = (typeof SELECT_KEY)[keyof typeof SELECT_KEY];

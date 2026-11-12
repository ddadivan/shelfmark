import type { THEME } from './theme.const';

export type Theme = (typeof THEME)[keyof typeof THEME];

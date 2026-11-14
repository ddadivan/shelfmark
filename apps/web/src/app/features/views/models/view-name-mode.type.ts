import type { VIEW_NAME_MODE } from './view-name-mode.const';

/** One of `VIEW_NAME_MODE`. */
export type ViewNameMode = (typeof VIEW_NAME_MODE)[keyof typeof VIEW_NAME_MODE];

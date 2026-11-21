import type { LINK_CLICK_ACTION } from './link-click-action.const';

/** One of `LINK_CLICK_ACTION`. */
export type LinkClickAction = (typeof LINK_CLICK_ACTION)[keyof typeof LINK_CLICK_ACTION];

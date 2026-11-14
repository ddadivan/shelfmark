import type { LINK_OPEN_TARGET } from './link-open-target.const';

/** One of `LINK_OPEN_TARGET`. */
export type LinkOpenTarget = (typeof LINK_OPEN_TARGET)[keyof typeof LINK_OPEN_TARGET];

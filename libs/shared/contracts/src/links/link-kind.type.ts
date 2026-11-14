import type { LINK_KIND } from './link-kind.const';

/** One of `LINK_KIND`. */
export type LinkKind = (typeof LINK_KIND)[keyof typeof LINK_KIND];

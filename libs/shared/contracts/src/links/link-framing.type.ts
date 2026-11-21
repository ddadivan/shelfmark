import type { LINK_FRAMING } from './link-framing.const';

/** One of `LINK_FRAMING`. */
export type LinkFraming = (typeof LINK_FRAMING)[keyof typeof LINK_FRAMING];

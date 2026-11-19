import type { ASK_DEPTH } from './ask-depth.const';

/** One of `ASK_DEPTH`. */
export type AskDepth = (typeof ASK_DEPTH)[keyof typeof ASK_DEPTH];

import type { ASK_MATCH } from './ask-match.const';

/** One of `ASK_MATCH`. */
export type AskMatch = (typeof ASK_MATCH)[keyof typeof ASK_MATCH];

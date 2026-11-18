import type { ASK_PERIOD } from './ask-period.const';

/** One of `ASK_PERIOD`. */
export type AskPeriod = (typeof ASK_PERIOD)[keyof typeof ASK_PERIOD];

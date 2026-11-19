import type { ASK_LOOP_OUTCOME } from './ask-loop-outcome.const';

/** One of `ASK_LOOP_OUTCOME`. */
export type AskLoopOutcome = (typeof ASK_LOOP_OUTCOME)[keyof typeof ASK_LOOP_OUTCOME];

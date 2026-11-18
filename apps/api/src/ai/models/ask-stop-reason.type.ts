import type { ASK_STOP_REASON } from './ask-stop-reason.const';

/** One of `ASK_STOP_REASON`. */
export type AskStopReason = (typeof ASK_STOP_REASON)[keyof typeof ASK_STOP_REASON];

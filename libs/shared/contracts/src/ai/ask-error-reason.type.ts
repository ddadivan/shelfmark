import type { ASK_ERROR_REASON } from './ask-error-reason.const';

/** One of `ASK_ERROR_REASON`. */
export type AskErrorReason = (typeof ASK_ERROR_REASON)[keyof typeof ASK_ERROR_REASON];

import type { KEEP_REASON } from './keep-reason.const';

/** One of `KEEP_REASON`. */
export type KeepReason = (typeof KEEP_REASON)[keyof typeof KEEP_REASON];

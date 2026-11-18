import type { DUPLICATE_REASON } from './duplicate-reason.const';

/** One of `DUPLICATE_REASON`. */
export type DuplicateReason = (typeof DUPLICATE_REASON)[keyof typeof DUPLICATE_REASON];

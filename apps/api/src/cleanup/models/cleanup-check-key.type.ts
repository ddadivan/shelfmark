import type { CLEANUP_CHECK_KEY } from './cleanup-check-key.const';

/** One of `CLEANUP_CHECK_KEY`. */
export type CleanupCheckKey = (typeof CLEANUP_CHECK_KEY)[keyof typeof CLEANUP_CHECK_KEY];

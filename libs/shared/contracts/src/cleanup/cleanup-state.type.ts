import type { CLEANUP_STATE } from './cleanup-state.const';

/** One of `CLEANUP_STATE`. */
export type CleanupState = (typeof CLEANUP_STATE)[keyof typeof CLEANUP_STATE];

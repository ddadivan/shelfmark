import type { CLEANUP_VIEW } from './cleanup-view.const';

/** One of `CLEANUP_VIEW`. */
export type CleanupView = (typeof CLEANUP_VIEW)[keyof typeof CLEANUP_VIEW];

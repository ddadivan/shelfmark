import type { CLEANUP_SOURCE } from './cleanup-source.const';

/** One of `CLEANUP_SOURCE`. */
export type CleanupSource = (typeof CLEANUP_SOURCE)[keyof typeof CLEANUP_SOURCE];

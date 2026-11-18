import type { CLEANUP_GROUP } from './cleanup-group.const';

/** One of `CLEANUP_GROUP`. */
export type CleanupGroup = (typeof CLEANUP_GROUP)[keyof typeof CLEANUP_GROUP];

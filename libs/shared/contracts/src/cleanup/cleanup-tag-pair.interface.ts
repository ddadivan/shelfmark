import type { CleanupSource } from './cleanup-source.type';
import type { CleanupTag } from './cleanup-tag.interface';

/** Two similar tags: `merge` is merged into `keep` unless the user swaps them. */
export interface CleanupTagPair {
  /** Stable id inside the stored report; sent back in `CleanupApplyTagMerge.pairId`. */
  id: string;
  source: CleanupSource;
  keep: CleanupTag;
  merge: CleanupTag;
}

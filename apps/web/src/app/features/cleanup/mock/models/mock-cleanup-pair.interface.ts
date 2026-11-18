import type { CleanupSource } from '@shelfmark/contracts';

/** A similar-tags pair as the mock report stores it: the two tag ids, the suggested keep first. */
export interface MockCleanupPair {
  id: string;
  source: CleanupSource;
  tagIds: readonly [string, string];
}

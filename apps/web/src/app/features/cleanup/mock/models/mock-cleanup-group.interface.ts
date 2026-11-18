import type { CleanupSource, DuplicateReason } from '@shelfmark/contracts';

/** A duplicate group as the mock report stores it: ids only, like the API's findings. */
export interface MockCleanupGroup {
  id: string;
  reason: DuplicateReason;
  source: CleanupSource;
  linkIds: string[];
}

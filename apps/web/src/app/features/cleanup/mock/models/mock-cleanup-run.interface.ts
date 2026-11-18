import type { CleanupState } from '@shelfmark/contracts';
import type { MockCleanupGroup } from './mock-cleanup-group.interface';
import type { MockCleanupPair } from './mock-cleanup-pair.interface';

/** The mock's stored clean-up report (in memory, like one `cleanup_reports` row). */
export interface MockCleanupRun {
  state: CleanupState;
  includeAi: boolean;
  /** Live links with a vector when the run started (0 without AI checks or search not ready). */
  total: number;
  /** Epoch ms the run started. */
  startedAt: number;
  /** AI checks still to run (the deferred pass). */
  pending: boolean;
  duplicates: MockCleanupGroup[];
  similarTags: MockCleanupPair[];
}

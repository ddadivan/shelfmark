import type { CleanupCheckKey } from './cleanup-check-key.type';
import type { StoredDuplicateGroup } from './stored-duplicate-group.interface';
import type { StoredTagPair } from './stored-tag-pair.interface';

/**
 * `cleanup_reports.findings` (ADR 0052 point 1): group ids, reasons and link or tag ids only, never
 * titles, URLs or names. Read back through `readStoredFindings`, which narrows anything else away.
 */
export interface StoredCleanupFindings {
  duplicates: StoredDuplicateGroup[];
  similarTags: StoredTagPair[];
  /** Deferred checks still to run while the report is `running`, in order. */
  pending: CleanupCheckKey[];
  /** Near-duplicate link id pairs found so far by the deferred scan (grouped when it ends). */
  nearPairs: [string, string][];
}

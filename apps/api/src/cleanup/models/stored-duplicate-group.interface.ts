import type { CleanupSource, DuplicateReason } from '@shelfmark/contracts';

/** A duplicate group as stored in the report: ids only (ADR 0052 point 1). */
export interface StoredDuplicateGroup {
  id: string;
  reason: DuplicateReason;
  source: CleanupSource;
  /** 2 to `CLEANUP_LIMIT.GroupSizeMax` link ids; the kept one is chosen live when read. */
  linkIds: string[];
}

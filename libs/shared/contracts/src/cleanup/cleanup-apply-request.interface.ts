import type { CleanupApplyDuplicate } from './cleanup-apply-duplicate.interface';
import type { CleanupApplyTagMerge } from './cleanup-apply-tag-merge.interface';

/** `POST /api/cleanup/apply` body: at least one item over both lists. */
export interface CleanupApplyRequest {
  /** At most `CLEANUP_LIMIT.ApplyGroupsMax`. */
  duplicates: CleanupApplyDuplicate[];
  /** At most `CLEANUP_LIMIT.ApplyTagMergesMax`. */
  tagMerges: CleanupApplyTagMerge[];
}

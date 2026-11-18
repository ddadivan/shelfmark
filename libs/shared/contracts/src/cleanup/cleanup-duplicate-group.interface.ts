import type { LinkResponse } from '../links/link-response.interface';
import type { CleanupSource } from './cleanup-source.type';
import type { DuplicateReason } from './duplicate-reason.type';
import type { KeepReason } from './keep-reason.type';

/** One duplicate group of the report, read live: the kept link and the copies offered for Trash. */
export interface CleanupDuplicateGroup {
  /** Stable id inside the stored report; sent back in `CleanupApplyDuplicate.groupId`. */
  id: string;
  reason: DuplicateReason;
  source: CleanupSource;
  keep: LinkResponse;
  keepReason: KeepReason;
  /** At least one live copy. */
  copies: LinkResponse[];
}

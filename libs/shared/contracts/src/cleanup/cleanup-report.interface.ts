import type { CleanupDuplicateGroup } from './cleanup-duplicate-group.interface';
import type { CleanupState } from './cleanup-state.type';
import type { CleanupTagPair } from './cleanup-tag-pair.interface';

/** `GET /api/cleanup` (and the run answer): the user's stored report, read live. */
export interface CleanupReport {
  state: CleanupState;
  /** Links checked by the near-duplicate pass so far. */
  checked: number;
  /** Live links with a current vector when the run started (0 without AI checks). */
  total: number;
  /** ISO time the run started; `null` before the first run. */
  checkedAt: string | null;
  /** Whether this run includes the AI checks. */
  aiIncluded: boolean;
  /** Whether AI checks could be included now (AI on, AI pack, allowance left). */
  aiAvailable: boolean;
  duplicates: CleanupDuplicateGroup[];
  similarTags: CleanupTagPair[];
}

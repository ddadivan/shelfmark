import type { DuplicateReason, KeepReason } from '@shelfmark/contracts';

/** One duplicate group as the page shows it: one row, its copies go to Trash when selected. */
export interface CleanupDuplicateRow {
  /** The report's group id. */
  id: string;
  /** Title of the kept link. */
  title: string;
  reason: DuplicateReason;
  /** Found by AI ("Same page"). */
  ai: boolean;
  /** Copies that go to Trash. */
  copies: number;
  keepReason: KeepReason;
  /** Folder name of the kept link; `null` = Unsorted. */
  place: string | null;
  /** Distinct hosts of the group, the kept link's first. */
  hosts: string[];
  selected: boolean;
}

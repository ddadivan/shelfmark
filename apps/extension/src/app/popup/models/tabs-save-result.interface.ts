import type { SkippedTab } from './skipped-tab.interface';
import type { TabEntry } from './tab-entry.interface';

/** What one batch Save did: the saved tabs, the skipped ones, and the folders the links went to. */
export interface TabsSaveResult {
  readonly saved: readonly TabEntry[];
  readonly skipped: readonly SkippedTab[];
  /** Distinct folder ids of the saved links (`null` is Unsorted). */
  readonly folderIds: readonly (string | null)[];
}

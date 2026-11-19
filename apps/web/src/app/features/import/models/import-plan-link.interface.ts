import type { ImportLinkItem } from '@shelfmark/contracts';

/**
 * One link of an `ImportPlan`; its `folderId` is filled from `folderKey` after the start, unless
 * `folderId` names an existing folder (an AI group that files into one).
 */
export interface ImportPlanLink {
  readonly item: Omit<ImportLinkItem, 'folderId'>;
  /** Key of a planned folder; `null` = the import's target. */
  readonly folderKey: string | null;
  /** A live own folder chosen for this link (wins over `folderKey`). */
  readonly folderId?: string;
}

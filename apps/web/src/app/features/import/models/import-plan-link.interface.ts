import type { ImportLinkItem } from '@shelfmark/contracts';

/** One link of an `ImportPlan`; its `folderId` is filled from `folderKey` after the start. */
export interface ImportPlanLink {
  readonly item: Omit<ImportLinkItem, 'folderId'>;
  /** Key of a planned folder; `null` = the import's target. */
  readonly folderKey: string | null;
}

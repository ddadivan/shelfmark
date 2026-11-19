import type { StartImportRequest } from '@shelfmark/contracts';
import type { ImportGroupedFolders } from './import-grouped-folders.interface';
import type { ImportPlan } from './import-plan.interface';

/** What the review step hands to the run: the start body without folders, the plan, the target name. */
export interface ImportRunRequest {
  readonly start: Omit<StartImportRequest, 'folders'>;
  readonly plan: ImportPlan;
  /** Name of the target folder for the summary; `null` for Unsorted. */
  readonly targetName: string | null;
  /** With AI groups: the folders the links went into and how many of them are new. */
  readonly grouped?: ImportGroupedFolders;
}

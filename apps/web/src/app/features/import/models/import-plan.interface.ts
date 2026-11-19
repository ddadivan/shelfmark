import type { ImportFolder } from '@shelfmark/contracts';
import type { ImportPlanLink } from './import-plan-link.interface';

/** What will be sent, worked out from the file and the review choices before anything is written. */
export interface ImportPlan {
  /** Folders of the file to create (empty when flattened). */
  readonly folders: readonly ImportFolder[];
  readonly links: readonly ImportPlanLink[];
  /** Duplicates and non-web entries left out. */
  readonly skipped: number;
}

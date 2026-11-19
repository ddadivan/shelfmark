import type { ImportFolder } from '@shelfmark/contracts';
import type { ImportGroupPlace } from './import-group-place.interface';

/** What the ticked groups mean for the plan: the new folders and where each grouped link goes. */
export interface ImportGroupsAssignment {
  /** Ticked new groups, directly under the target. */
  readonly folders: readonly ImportFolder[];
  /** Per grouped link index; a link without an entry goes to the target. */
  readonly places: ReadonlyMap<number, ImportGroupPlace>;
}

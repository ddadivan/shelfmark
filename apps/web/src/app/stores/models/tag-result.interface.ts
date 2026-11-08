import type { TagResponse } from '@shelfmark/contracts';
import type { TagOutcome } from './tag-outcome.type';

/**
 * Result of a create, rename or merge. `tag` is the created or renamed tag (`Done`), the merge
 * target (`Done` of a merge) or, on `Conflict`, the existing tag that owns the name.
 */
export interface TagResult {
  readonly outcome: TagOutcome;
  readonly tag?: TagResponse;
}

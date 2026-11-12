import { TAG_LIMIT } from '@shelfmark/contracts';
import { TAG_OUTCOME } from '../../../stores/models/tag-outcome.const';
import type { TagResult } from '../../../stores/models/tag-result.interface';
import type { TagFieldError } from '../models/tag-field-error.interface';

/**
 * The message for a create or rename that did not go through; `null` when it was saved, or when
 * a rename ran into an existing tag (the merge is offered instead of an error).
 */
export function tagSaveError(
  result: TagResult,
  renaming: boolean,
  name: string,
): TagFieldError | null {
  switch (result.outcome) {
    case TAG_OUTCOME.Done:
      return null;
    case TAG_OUTCOME.Conflict:
      return renaming && result.tag ? null : { key: 'tags.name.exists', params: { name } };
    case TAG_OUTCOME.LimitReached:
      return { key: 'tags.add.limit', params: { max: TAG_LIMIT.PerUserMax } };
    default:
      return { key: renaming ? 'tags.rename.failed' : 'tags.add.failed' };
  }
}

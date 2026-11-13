import { TAG_LIMIT } from '@shelfmark/contracts';
import type { TagFieldError } from '../models/tag-field-error.interface';

/**
 * What is wrong with an already normalized tag name, if anything. A new tag (`renaming` false)
 * is also refused once the per-user limit is reached.
 */
export function validateTagName(
  name: string,
  renaming: boolean,
  atLimit: boolean,
): TagFieldError | null {
  if (name === '') {
    return { key: 'tags.name.required', params: { max: TAG_LIMIT.NameMax } };
  }
  if (name.length > TAG_LIMIT.NameMax) {
    return { key: 'tags.name.tooLong', params: { max: TAG_LIMIT.NameMax } };
  }
  if (!renaming && atLimit) {
    return { key: 'tags.add.limit', params: { max: TAG_LIMIT.PerUserMax } };
  }
  return null;
}

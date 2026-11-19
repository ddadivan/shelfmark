import type { CreateLinksBatchRequest } from '@shelfmark/contracts';
import type { LinksBatchItemInput } from './links-batch-item-input.interface';

/** `CreateLinksBatchRequest` with items that may carry the internal fields; the public request is assignable. */
export interface LinksBatchInput extends Omit<CreateLinksBatchRequest, 'items'> {
  items: LinksBatchItemInput[];
}

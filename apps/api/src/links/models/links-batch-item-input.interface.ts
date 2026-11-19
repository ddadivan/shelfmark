import type { CreateLinksBatchItem } from '@shelfmark/contracts';

/**
 * A batch item as the services see it: the public item of `POST /links/batch` plus two fields only
 * internal callers (the import, ADR 0056) can set. `CreateLinksBatchItem` stays assignable.
 */
export interface LinksBatchItemInput extends CreateLinksBatchItem {
  /** Stored as the link's note. */
  note?: string;
  /** Stored as the save date (`created_at`); absent = the paste order of the batch. */
  createdAt?: Date;
}

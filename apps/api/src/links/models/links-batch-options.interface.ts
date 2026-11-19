import type { Prisma } from '../../generated/prisma/client';

/** What only the import (ADR 0056) changes about a batch create; paste many passes none of it. */
export interface LinksBatchOptions {
  /**
   * The import the batch belongs to: created links get `import_id`, domain rules are off, the tags
   * this batch creates get `import_id`, and the import's `links_created` grows by the links created
   * (all in the batch transaction).
   */
  importId?: string;
  /** `false` keeps a URL repeated within the batch; default `true` (paste many). */
  skipRepeats?: boolean;
  /**
   * Runs in the batch transaction right after the folders lock, before anything is read or written;
   * a throw aborts the batch. The import uses it to check, under the lock Undo also takes, that it
   * is still open.
   */
  afterLock?: (tx: Prisma.TransactionClient) => Promise<void>;
}

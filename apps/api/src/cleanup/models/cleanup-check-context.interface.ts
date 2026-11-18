import type { CleanupDbClient } from './cleanup-db-client.type';
import type { StoredCleanupFindings } from './stored-cleanup-findings.interface';

/** What a check sees while it runs: the session user's ids and the findings it may extend. */
export interface CleanupCheckContext {
  db: CleanupDbClient;
  userId: string;
  isDemo: boolean;
  /** Mutable: a check appends its groups or pairs (ids only). */
  findings: StoredCleanupFindings;
  /** Keyset cursor of a chunked check (`null` at the start). */
  cursor: string | null;
  /** Links checked by a chunked check so far. */
  checked: number;
  /** The deferred pass's current lease on the report (`null` for the rule checks of a run). */
  lease: Date | null;
}

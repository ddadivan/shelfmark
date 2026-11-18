import type { CleanupGroup } from '@shelfmark/contracts';
import type { CleanupCheckContext } from './cleanup-check-context.interface';
import type { CleanupCheckKey } from './cleanup-check-key.type';
import type { CleanupCheckProgress } from './cleanup-check-progress.interface';

/**
 * One clean-up check behind the seam (ADR 0053 point 2). Rule checks (`needsAi: false`) finish in the
 * run request; AI checks are deferred and continued by the tick until `done`, each step within the
 * deadline (epoch ms). A check writes ids only into `ctx.findings` and filters every query by
 * `ctx.userId`. #397 adds a dead-link check with its own group and apply action.
 */
export interface CleanupCheck {
  key: CleanupCheckKey;
  group: CleanupGroup;
  needsAi: boolean;
  /** Reads the stored vectors (search by meaning must be `ready`). */
  needsVectors: boolean;
  run(ctx: CleanupCheckContext, deadline: number): Promise<CleanupCheckProgress>;
}

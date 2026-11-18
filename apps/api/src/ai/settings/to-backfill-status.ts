import { AI_BACKFILL_STATE, type AiBackfillStatus } from '@shelfmark/contracts';
import { AI_STATUS_LIMIT } from '../models/ai-status-limit.const';
import type { StoredAiSettings } from '../models/stored-ai-settings.interface';

/**
 * The backfill block of the settings and tick answers. A run reports its own progress; while idle
 * the estimate is for the eligible links. `estimatedMinutes` is `null` when nothing is left.
 */
export function toBackfillStatus(stored: StoredAiSettings, eligible: number): AiBackfillStatus {
  const idle = stored.backfillState === AI_BACKFILL_STATE.Idle;
  const total = idle ? 0 : stored.backfillTotal;
  const done = idle ? 0 : Math.min(stored.backfillDone, total);
  const left = stored.backfillState === AI_BACKFILL_STATE.Running ? total - done : eligible;
  return {
    state: stored.backfillState,
    eligible,
    total,
    done,
    estimatedMinutes: left > 0 ? Math.ceil(left / AI_STATUS_LIMIT.BackfillLinksPerMinute) : null,
  };
}

import type { AiBackfillState, AiSettings } from '@shelfmark/contracts';

/** The `ai_settings` row of a user as the services read it (defaults when there is no row). */
export interface StoredAiSettings {
  settings: AiSettings;
  enabledAt: Date | null;
  introSeenAt: Date | null;
  backfillState: AiBackfillState;
  backfillTotal: number;
  backfillDone: number;
  backfillUsed: number;
}

import type { AiBackfillState, AiSettings } from '@shelfmark/contracts';

/** The `ai_settings` row of a user as the services read it (defaults when there is no row). */
export interface StoredAiSettings {
  settings: AiSettings;
  enabledAt: Date | null;
  introSeenAt: Date | null;
  announcementSeenAt: Date | null;
  backfillState: AiBackfillState;
  backfillTotal: number;
  backfillDone: number;
  backfillUsed: number;
  /** The last failed embed call (search by meaning), cleared by a success. */
  embedFailedAt: Date | null;
}

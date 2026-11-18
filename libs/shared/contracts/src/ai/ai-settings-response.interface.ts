import type { AskStatus } from './ask-status.interface';
import type { AiBackfillStatus } from './ai-backfill-status.interface';
import type { AiEntitlements } from './ai-entitlements.interface';
import type { AiProviderStatus } from './ai-provider-status.type';
import type { AiSearchStatus } from './ai-search-status.interface';
import type { AiSettings } from './ai-settings.interface';
import type { AiUsage } from './ai-usage.interface';

/** `GET` and `PATCH /api/ai/settings` answer. */
export interface AiSettingsResponse {
  settings: AiSettings;
  /** `true` once AI was turned on through the first-run intro; until then turning it on opens the intro. */
  introSeen: boolean;
  entitlements: AiEntitlements;
  usage: AiUsage;
  providerStatus: AiProviderStatus;
  /** Jobs of the user still pending; the web app calls the tick while this is above 0. */
  pendingJobs: number;
  backfill: AiBackfillStatus;
  /** Search by meaning readiness; the web app calls the tick while `state` is `processing`. */
  search: AiSearchStatus;
  /** Ask your shelf availability and the question allowance (AI-4). */
  ask: AskStatus;
}

import type { AiSettings } from './ai-settings.interface';

/**
 * `PATCH /api/ai/settings` body: the fields to change (at least one). The first `enabled: true`
 * records that the intro was seen; `enabled: false` stops pending jobs and a running backfill.
 */
export type UpdateAiSettingsRequest = Partial<AiSettings> & {
  /** `true` once the one-time "Shelfmark can now help with AI" dialog was closed or answered (#507). */
  announcementSeen?: true;
};

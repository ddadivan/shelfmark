import {
  AI_BACKFILL_STATE,
  AI_FEATURE_MODE,
  type AiBackfillState,
  type AiFeatureMode,
  type AiSummaryLanguage,
} from '@shelfmark/contracts';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { AI_SUMMARY_LANGUAGES } from '../models/ai-summary-languages.const';
import type { AiSettingsRow } from '../models/ai-settings-row.interface';
import type { StoredAiSettings } from '../models/stored-ai-settings.interface';

const MODES: readonly string[] = Object.values(AI_FEATURE_MODE);
const BACKFILL_STATES: readonly string[] = Object.values(AI_BACKFILL_STATE);

function isMode(value: string): value is AiFeatureMode {
  return MODES.includes(value);
}

function isSummaryLanguage(value: string): value is AiSummaryLanguage {
  return (AI_SUMMARY_LANGUAGES as readonly string[]).includes(value);
}

function isBackfillState(value: string): value is AiBackfillState {
  return BACKFILL_STATES.includes(value);
}

/** A row (or none: the defaults, AI off); anything a hand edit put past the CHECKs reads as the default. */
export function toStoredAiSettings(row: AiSettingsRow | null): StoredAiSettings {
  if (row === null) {
    return {
      settings: { ...AI_SETTINGS_DEFAULT },
      enabledAt: null,
      introSeenAt: null,
      announcementSeenAt: null,
      backfillState: AI_BACKFILL_STATE.Idle,
      backfillTotal: 0,
      backfillDone: 0,
      backfillUsed: 0,
      embedFailedAt: null,
    };
  }
  return {
    settings: {
      enabled: row.enabled,
      folderMode: isMode(row.folderMode) ? row.folderMode : AI_SETTINGS_DEFAULT.folderMode,
      tagsMode: isMode(row.tagsMode) ? row.tagsMode : AI_SETTINGS_DEFAULT.tagsMode,
      summaries: row.summaries,
      includeNotes: row.includeNotes,
      summaryLanguage: isSummaryLanguage(row.summaryLanguage)
        ? row.summaryLanguage
        : AI_SETTINGS_DEFAULT.summaryLanguage,
      meaningSearch: row.meaningSearch,
      ask: row.ask,
    },
    enabledAt: row.enabledAt,
    introSeenAt: row.introSeenAt,
    announcementSeenAt: row.announcementSeenAt,
    backfillState: isBackfillState(row.backfillState) ? row.backfillState : AI_BACKFILL_STATE.Idle,
    backfillTotal: row.backfillTotal,
    backfillDone: row.backfillDone,
    backfillUsed: row.backfillUsed,
    embedFailedAt: row.embedFailedAt,
  };
}

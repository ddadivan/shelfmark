import { AI_FEATURE_MODE, AI_SUMMARY_LANGUAGE_APP, type AiSettings } from '@shelfmark/contracts';

/** The settings of a user without an `ai_settings` row: AI off (opt-in), the rest the defaults. */
export const AI_SETTINGS_DEFAULT: AiSettings = {
  enabled: false,
  folderMode: AI_FEATURE_MODE.Suggest,
  tagsMode: AI_FEATURE_MODE.Suggest,
  summaries: true,
  includeNotes: false,
  summaryLanguage: AI_SUMMARY_LANGUAGE_APP,
};

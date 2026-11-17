import { AI_FEATURE_MODE, AI_SUMMARY_LANGUAGE_APP, type AiSettings } from '@shelfmark/contracts';

/** What Settings › AI shows until the account's settings are known: AI off (opt-in), the API's defaults. */
export const AI_SETTINGS_DEFAULT: Readonly<AiSettings> = {
  enabled: false,
  folderMode: AI_FEATURE_MODE.Suggest,
  tagsMode: AI_FEATURE_MODE.Suggest,
  summaries: true,
  includeNotes: false,
  summaryLanguage: AI_SUMMARY_LANGUAGE_APP,
};

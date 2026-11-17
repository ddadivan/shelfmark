/** The columns `toStoredAiSettings` reads. */
export interface AiSettingsRow {
  enabled: boolean;
  folderMode: string;
  tagsMode: string;
  summaries: boolean;
  includeNotes: boolean;
  summaryLanguage: string;
  meaningSearch: boolean;
  enabledAt: Date | null;
  introSeenAt: Date | null;
  backfillState: string;
  backfillTotal: number;
  backfillDone: number;
  backfillUsed: number;
}

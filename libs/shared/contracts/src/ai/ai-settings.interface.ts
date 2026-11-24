import type { AiFeatureMode } from './ai-feature-mode.type';
import type { AiSummaryLanguage } from './ai-summary-language.type';

/** The user's choices in Settings › AI. AI is off by default (opt-in, `docs/ai/FEATURES.md` principle 1). */
export interface AiSettings {
  /** The main switch: off means no link data leaves Shelfmark for a model provider. */
  enabled: boolean;
  /** Default `suggest`. */
  folderMode: AiFeatureMode;
  /** Default `suggest`. */
  tagsMode: AiFeatureMode;
  /** Short summaries; default on. */
  summaries: boolean;
  /** Send the link's note to the model; default off. */
  includeNotes: boolean;
  /** Default `app`. */
  summaryLanguage: AiSummaryLanguage;
  /**
   * Search by meaning and related links (AI-3): title, tag names, summary (and the note with
   * `includeNotes`) and search text go to the embedding provider. On for settings created from AI-3
   * on, off for rows that existed before.
   */
  meaningSearch: boolean;
  /**
   * Ask your shelf (AI-4, ADR 0052): the question and the matching links go to the model when the
   * user asks. Default on, existing rows too.
   */
  ask: boolean;
  /**
   * Keep Ask history (ADR 0055 amendment, 2026-11-24): finished questions and answers are stored on
   * the server for `ASK_HISTORY_LIMIT.RetentionDays` (links by id only). Off: nothing new is stored;
   * what was stored stays until cleared. Default on.
   */
  askHistory: boolean;
}

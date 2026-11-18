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
}

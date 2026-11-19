import type { ImportAiState } from './import-ai-state.type';

/** The AI pass of one import, in `ImportSummary.ai`. */
export interface ImportAiSummary {
  state: ImportAiState;
  /** Links the pass covers. */
  total: number;
  /** Links with a result (or failed) so far. */
  done: number;
  /** Links of the import that now have an AI summary. */
  summaries: number;
  /** Links of the import with open tag or folder suggestions (the Tidy review of this import). */
  suggestions: number;
}

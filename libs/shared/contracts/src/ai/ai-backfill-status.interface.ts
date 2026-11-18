import type { AiBackfillState } from './ai-backfill-state.type';

/** "Process existing links" in Settings › AI. */
export interface AiBackfillStatus {
  state: AiBackfillState;
  /** Live links saved before AI was turned on that have no AI result yet. */
  eligible: number;
  /** Links in the current or last run; 0 when idle. */
  total: number;
  /** Links of that run already processed. */
  done: number;
  /** Rough time left for a run, or for `eligible` when idle; `null` when nothing is left. */
  estimatedMinutes: number | null;
}

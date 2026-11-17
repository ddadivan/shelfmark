import type { AiBackfillState } from '@shelfmark/contracts';

/** "Process existing links" in the mock: the links of the run and when it started. */
export interface MockAiBackfillRun {
  state: AiBackfillState;
  linkIds: string[];
  done: number;
  /** `Date.now()` of the start (or of the last advance after a stop). */
  startedAt: number;
}

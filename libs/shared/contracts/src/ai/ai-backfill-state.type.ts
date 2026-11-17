import type { AI_BACKFILL_STATE } from './ai-backfill-state.const';

/** One of `AI_BACKFILL_STATE`. */
export type AiBackfillState = (typeof AI_BACKFILL_STATE)[keyof typeof AI_BACKFILL_STATE];

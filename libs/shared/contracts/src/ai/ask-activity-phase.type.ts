import type { ASK_ACTIVITY_PHASE } from './ask-activity-phase.const';

/** One of `ASK_ACTIVITY_PHASE`. */
export type AskActivityPhase = (typeof ASK_ACTIVITY_PHASE)[keyof typeof ASK_ACTIVITY_PHASE];

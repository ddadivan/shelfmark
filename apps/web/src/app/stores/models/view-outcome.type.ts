import type { VIEW_OUTCOME } from './view-outcome.const';

/** One of `VIEW_OUTCOME`. */
export type ViewOutcome = (typeof VIEW_OUTCOME)[keyof typeof VIEW_OUTCOME];

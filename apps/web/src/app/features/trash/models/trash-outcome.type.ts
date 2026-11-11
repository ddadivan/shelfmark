import type { TRASH_OUTCOME } from './trash-outcome.const';

export type TrashOutcome = (typeof TRASH_OUTCOME)[keyof typeof TRASH_OUTCOME];

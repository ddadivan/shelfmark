import type { SAVE_OUTCOME } from './save-outcome.const';

export type SaveOutcome = (typeof SAVE_OUTCOME)[keyof typeof SAVE_OUTCOME];

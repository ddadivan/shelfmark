import type { TAG_OUTCOME } from './tag-outcome.const';

export type TagOutcome = (typeof TAG_OUTCOME)[keyof typeof TAG_OUTCOME];

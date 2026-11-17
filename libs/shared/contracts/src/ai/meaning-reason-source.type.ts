import type { MEANING_REASON_SOURCE } from './meaning-reason-source.const';

/** One of `MEANING_REASON_SOURCE`. */
export type MeaningReasonSource =
  (typeof MEANING_REASON_SOURCE)[keyof typeof MEANING_REASON_SOURCE];

/**
 * Ask retrieval (ADR 0052 point 3): up to `MeaningMax` meaning matches and `WordsMax` word matches
 * (out of the newest `WordsScanMax` links matching any of at most `KeywordsMax` topic words) are fused.
 */
export const ASK_RETRIEVAL_LIMIT = {
  MeaningMax: 20,
  WordsMax: 20,
  WordsScanMax: 60,
  KeywordsMax: 6,
} as const;

/**
 * Embedding limits shared by every provider (ADR 0052): the column is `halfvec(1024)`, a request
 * holds at most `BatchMax` texts.
 */
export const EMBEDDING_LIMIT = {
  Dimensions: 1024,
  BatchMax: 64,
} as const;

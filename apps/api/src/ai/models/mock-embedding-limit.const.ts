/**
 * The deterministic mock embedding provider: feature hashing of word stems into 1,024 dimensions,
 * each stem touching `HashesPerStem` dimensions. A query containing `FailMarker` fails (e2e).
 */
export const MOCK_EMBEDDING_LIMIT = {
  Model: 'mock-embed-1',
  HashesPerStem: 4,
  MinSimilarity: 0.15,
  FailMarker: 'ai-fail',
} as const;

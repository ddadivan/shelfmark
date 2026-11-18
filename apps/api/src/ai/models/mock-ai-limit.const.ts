/** Shapes of the deterministic mock answers. */
export const MOCK_AI = {
  /** Words shorter than this never match a tag or folder name. */
  MinWordLength: 3,
  SummaryMax: 140,
  /** A URL containing this simulates a provider refusal (tests, e2e). */
  RefuseMarker: 'ai-refuse',
  /** A URL containing this simulates a provider outage (tests, e2e). */
  FailMarker: 'ai-fail',
  BatchPrefix: 'mock-batch-',
} as const;

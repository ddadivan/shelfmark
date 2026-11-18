/**
 * How long the mock's deferred AI pass takes (the progress runs from 0 to `total` meanwhile), long
 * enough for an e2e test to see the checking state, short enough not to slow it down.
 */
export const MOCK_CLEANUP_TIMING = {
  PassMs: 4_000,
} as const;

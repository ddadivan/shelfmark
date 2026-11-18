/**
 * Ask request limits beyond the contract (ADR 0052 points 2 and 7): the one-question lease outlasts
 * the hard stop plus retrieval, and is released when the answer ends.
 */
export const ASK_SERVICE_LIMIT = {
  LeaseMs: 30_000,
} as const;

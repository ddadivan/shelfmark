/**
 * How long the mock AI takes: a job finishes `JobMs` after it was queued (checked on the next read,
 * no timers), "Process existing links" handles one link every `BackfillLinkMs`.
 */
export const MOCK_AI_TIMING = {
  JobMs: 1200,
  BackfillLinkMs: 300,
} as const;

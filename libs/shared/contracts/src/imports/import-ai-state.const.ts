/**
 * The AI pass of an import (ADR 0056 decision 9): `running` while its links are processed against the
 * backfill allowance, `done` when every link has a result, `skipped` when it could not run (AI off, no
 * allowance left or "Process existing links" already running).
 */
export const IMPORT_AI_STATE = {
  Running: 'running',
  Done: 'done',
  Skipped: 'skipped',
} as const;

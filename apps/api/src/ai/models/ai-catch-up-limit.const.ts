/**
 * Budgets of the catch-up (ADR 0049 point 4). The tick and the sweep answer at once and do their work
 * after the response (`AiBackgroundService`), so the 8 s request timeout never cuts them: the tick
 * starts work for `TickBudgetMs`, the daily sweep for `SweepBudgetMs` (within the 30 s `maxDuration`).
 * A job is stale when it waited `StaleAfterSeconds` without being started or its lease expired; at
 * most `StaleJobsPerUser` per run. Unattached drafts are deleted after `DraftMaxAgeHours`.
 */
export const AI_CATCH_UP_LIMIT = {
  TickBudgetMs: 6_000,
  SweepBudgetMs: 25_000,
  StaleAfterSeconds: 30,
  StaleJobsPerUser: 20,
  SweepUsersMax: 200,
  DraftMaxAgeHours: 24,
  /** Daily Ask question counts are kept this long (the month view needs at most 31 days). */
  AskUsageMaxAgeDays: 62,
} as const;

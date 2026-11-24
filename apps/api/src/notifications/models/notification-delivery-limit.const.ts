/** Limits of one delivery run (`GET /api/cron/notifications`) and of one push. */
export const NOTIFICATION_DELIVERY_LIMIT = {
  /** Users read per batch (users with due, not yet pushed reminders and a device). */
  UsersPerBatch: 50,
  /** Due reminders pushed one by one per user and run; more become one "N reminders" message. */
  SinglePushesMax: 3,
  /** Due reminders read per user (the summary counts up to this). */
  RemindersPerUserMax: 50,
  /**
   * Only reminders that became due within this window are pushed: turning reminders on (or a first
   * device) never sends a backlog of old ones. Longer than the cron interval.
   */
  DueWindowHours: 48,
  /** Time budget of one run; the next run continues (`hasMore`). Below the function's 30 s. */
  BudgetMs: 15_000,
  /** Per push request to a push service. */
  SendTimeoutMs: 5_000,
  /** How long a push service keeps an undelivered message (seconds). */
  TtlSeconds: 12 * 60 * 60,
} as const;

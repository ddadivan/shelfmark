/**
 * Limits of the admin stats queries (ADR 0045): the statement timeout of the read-only
 * transaction (below the 8 s request timeout), the transaction's own limit, the window of
 * "opened recently", and the migration whose apply time is the start of activity tracking.
 */
export const ADMIN_STATS_QUERY = {
  StatementTimeoutMs: 5000,
  TransactionTimeoutMs: 7000,
  OpenedRecentlyDays: 30,
  ActivityMigration: '20261121120000_user_last_active_on',
} as const;

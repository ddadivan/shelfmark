/**
 * Limits of the admin usage stats (ADR 0045). `MinGroup` is the minimum group size: a share with a
 * smaller base, a mean or median of fewer people and a bucket of fewer people are never answered
 * as such (`null`, or merged into "Other"). The series are UTC days and weeks.
 */
export const ADMIN_STATS_LIMIT = { MinGroup: 3, SignUpDays: 30, SignUpWeeks: 12 } as const;

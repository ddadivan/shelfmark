/** The `cleanup_reports` columns the services read. */
export interface CleanupReportRow {
  state: string;
  includeAi: boolean;
  checked: number;
  total: number;
  cursor: string | null;
  findings: unknown;
  startedAt: Date | null;
  progressAt: Date | null;
  appliedAt: Date | null;
  cardDismissedAt: Date | null;
}

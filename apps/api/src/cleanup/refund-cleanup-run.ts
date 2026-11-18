import { CLEANUP_STATE } from '@shelfmark/contracts';
import type { CleanupDbClient } from './models/cleanup-db-client.type';

/**
 * Gives back the AI clean-up run the user's report counted (ADR 0053 point 3): the month stored on
 * the row at the run (`ai_run_month`, so a pass that crosses a month boundary refunds the right one),
 * only while the pass still holds `lease` on a `running` report, and at most once (the month is
 * cleared in the same statement). Answers whether a run was given back.
 */
export async function refundCleanupRun(
  db: CleanupDbClient,
  userId: string,
  lease: Date,
): Promise<boolean> {
  const refunded = await db.$queryRaw<{ n: number }[]>`
    WITH report AS (
      -- RETURNING sees the new row, so the month is read from the pre-update self-join.
      UPDATE cleanup_reports AS r SET ai_run_month = NULL
      FROM cleanup_reports AS before
      WHERE r.user_id = ${userId}::uuid AND before.user_id = r.user_id
        AND r.state = ${CLEANUP_STATE.Running} AND r.lease_until = ${lease}
        AND r.ai_run_month IS NOT NULL
      RETURNING before.ai_run_month
    )
    UPDATE ai_usage SET cleanup_runs = ai_usage.cleanup_runs - 1
    FROM report
    WHERE ai_usage.user_id = ${userId}::uuid AND ai_usage.month = report.ai_run_month
      AND ai_usage.cleanup_runs > 0
    RETURNING ai_usage.cleanup_runs AS n`;
  return refunded.length > 0;
}

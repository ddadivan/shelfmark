import { AI_JOB_STATUS, AI_LIMIT, type AiJobStatus } from '@shelfmark/contracts';

/**
 * How much longer a card shows the summary skeleton (AiSummary spec): while the link's AI job is
 * pending and the link is younger than `AI_LIMIT.PendingSkeletonMs`; 0 when it shows none.
 */
export function summaryPendingMs(
  aiStatus: AiJobStatus | null | undefined,
  createdAt: string | undefined,
  now: number,
): number {
  if (aiStatus !== AI_JOB_STATUS.Pending || createdAt === undefined) {
    return 0;
  }
  const age = now - Date.parse(createdAt);
  return Number.isNaN(age) ? 0 : Math.max(0, AI_LIMIT.PendingSkeletonMs - Math.max(0, age));
}

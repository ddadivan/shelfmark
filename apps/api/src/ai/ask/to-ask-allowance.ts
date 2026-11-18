import { ASK_PERIOD, type AiQuotaLimits, type AskAllowance } from '@shelfmark/contracts';
import { usageResetsOn } from '../usage/usage-month';

/** `YYYY-MM-DD` of the next UTC day: when the daily question count resets. */
export function askDayResetsOn(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    .toISOString()
    .slice(0, 10);
}

/**
 * The allowance line from today's and this month's counts (ADR 0052 point 7): the limit with fewer
 * questions left wins; on a tie the month (it resets later, so it is the one that binds).
 */
export function toAskAllowance(
  limits: Pick<AiQuotaLimits, 'questionsPerDay' | 'questionsPerMonth'>,
  dayUsed: number,
  monthUsed: number,
  now: Date,
): AskAllowance {
  const dayLeft = Math.max(0, limits.questionsPerDay - dayUsed);
  const monthLeft = Math.max(0, limits.questionsPerMonth - monthUsed);
  return dayLeft < monthLeft
    ? { questionsLeft: dayLeft, period: ASK_PERIOD.Day, resetsOn: askDayResetsOn(now) }
    : { questionsLeft: monthLeft, period: ASK_PERIOD.Month, resetsOn: usageResetsOn(now) };
}

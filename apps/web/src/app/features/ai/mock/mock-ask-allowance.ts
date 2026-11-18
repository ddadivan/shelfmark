import { ASK_PERIOD, type AiQuotaLimits, type AskAllowance } from '@shelfmark/contracts';
import { nextUtcMonthStart } from './mock-ai-account';

/** `YYYY-MM-DD` of the UTC day after `now`: when the daily question count resets. */
export function nextUtcDayStart(now: number): string {
  const date = new Date(now);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1))
    .toISOString()
    .slice(0, 10);
}

/**
 * The Ask allowance like the API (ADR 0051 point 8): the limit with fewer questions left wins, the
 * month on a tie.
 */
export function mockAskAllowance(
  limits: Pick<AiQuotaLimits, 'questionsPerDay' | 'questionsPerMonth'>,
  dayUsed: number,
  monthUsed: number,
  now: number,
): AskAllowance {
  const dayLeft = Math.max(0, limits.questionsPerDay - dayUsed);
  const monthLeft = Math.max(0, limits.questionsPerMonth - monthUsed);
  return dayLeft < monthLeft
    ? { questionsLeft: dayLeft, period: ASK_PERIOD.Day, resetsOn: nextUtcDayStart(now) }
    : { questionsLeft: monthLeft, period: ASK_PERIOD.Month, resetsOn: nextUtcMonthStart(now) };
}

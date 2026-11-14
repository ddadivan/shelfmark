import { REMINDER_ERROR_MESSAGE } from './reminder-error-message.const';
import type { ReminderErrorMessage } from './reminder-error-message.type';
import { REMINDER_LIMIT } from './reminder-limit.const';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Why `remindAt` (an ISO time already checked for its format) cannot be a reminder at `now`
 * (milliseconds), or `null` when it can: it must lie in the future (with `PastToleranceMs` of clock
 * skew) and at most `MaxAheadDays` ahead. Shared by the API and the web mock.
 */
export function remindAtProblem(remindAt: string, now: number): ReminderErrorMessage | null {
  const at = Date.parse(remindAt);
  if (Number.isNaN(at) || at < now - REMINDER_LIMIT.PastToleranceMs) {
    return REMINDER_ERROR_MESSAGE.NotInFuture;
  }
  if (at > now + REMINDER_LIMIT.MaxAheadDays * MS_PER_DAY) {
    return REMINDER_ERROR_MESSAGE.TooFarAhead;
  }
  return null;
}

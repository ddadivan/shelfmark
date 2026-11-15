import { remindAtProblem } from './remind-at-problem';
import { REMINDER_ERROR_MESSAGE } from './reminder-error-message.const';
import { REMINDER_LIMIT } from './reminder-limit.const';

const NOW = Date.parse('2026-11-15T10:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

describe('remindAtProblem', () => {
  it('accepts a time in the future', () => {
    expect(remindAtProblem('2026-11-16T09:00:00.000Z', NOW)).toBeNull();
  });

  it('accepts a time within the clock skew tolerance', () => {
    const at = new Date(NOW - REMINDER_LIMIT.PastToleranceMs + 1).toISOString();
    expect(remindAtProblem(at, NOW)).toBeNull();
  });

  it('refuses a time in the past', () => {
    expect(remindAtProblem('2026-11-14T10:00:00.000Z', NOW)).toBe(
      REMINDER_ERROR_MESSAGE.NotInFuture,
    );
  });

  it('refuses a time that cannot be read', () => {
    expect(remindAtProblem('soon', NOW)).toBe(REMINDER_ERROR_MESSAGE.NotInFuture);
  });

  it('accepts the last allowed day and refuses one past it', () => {
    const last = new Date(NOW + REMINDER_LIMIT.MaxAheadDays * DAY).toISOString();
    const past = new Date(NOW + REMINDER_LIMIT.MaxAheadDays * DAY + 1).toISOString();
    expect(remindAtProblem(last, NOW)).toBeNull();
    expect(remindAtProblem(past, NOW)).toBe(REMINDER_ERROR_MESSAGE.TooFarAhead);
  });
});

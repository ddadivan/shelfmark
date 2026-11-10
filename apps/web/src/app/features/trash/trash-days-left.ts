import { MS_PER_DAY } from '../../core/models/ms-per-day.const';
import { CLOCK_SKEW_TOLERANCE_MS } from './models/clock-skew-tolerance-ms.const';

/**
 * Whole days until `expiresAt`, rounded up: "1 day left" up to the last moment. The server stamps
 * the delete, the browser reads the clock: a fresh entry of a 30 day retention must read "30 days
 * left" even when the browser clock runs a few minutes behind, so that much is forgiven while
 * anything is left. Zero or less means it is overdue and the next purge removes it (the purge
 * runs daily).
 */
export function daysLeft(expiresAt: string, now: number): number {
  const remaining = Date.parse(expiresAt) - now;
  if (remaining <= 0) {
    return Math.ceil(remaining / MS_PER_DAY);
  }
  return Math.max(1, Math.ceil((remaining - CLOCK_SKEW_TOLERANCE_MS) / MS_PER_DAY));
}

import { MS_PER_DAY } from '../../core/models/ms-per-day.const';

/**
 * Whole days until `expiresAt`, rounded up: "1 day left" up to the last moment, so a fresh
 * entry of a 30 day retention reads "30 days left". Zero or less means it is overdue and the
 * next purge removes it (the purge runs daily).
 */
export function daysLeft(expiresAt: string, now: number): number {
  return Math.ceil((Date.parse(expiresAt) - now) / MS_PER_DAY);
}

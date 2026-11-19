import { DEFAULT_FETCH_LIMITS } from '../../fetcher/models/fetch-limits.const';
import type { FetchLimits } from '../../fetcher/models/fetch-limits.interface';

/**
 * The limits of a fallback page fetch after the oEmbed lookup spent part of the same budget:
 * `totalTimeoutMs` lowered by the time `elapsedMs` already used, so lookup and fallback together
 * stay within the caller's budget. `null` when nothing is left.
 */
export function remainingLimits(
  limits: Partial<FetchLimits>,
  elapsedMs: number,
): Partial<FetchLimits> | null {
  const total = limits.totalTimeoutMs ?? DEFAULT_FETCH_LIMITS.totalTimeoutMs;
  const left = Math.floor(total - Math.max(0, elapsedMs));
  return left > 0 ? { ...limits, totalTimeoutMs: left } : null;
}

import type { FetchLimits } from './models/fetch-limits.interface';

/**
 * Per-call overrides can only tighten the limits of the service, never loosen them: each value is
 * `Math.min(base, override)`, and an `undefined` override keeps the base value.
 */
export function narrowLimits(base: FetchLimits, overrides?: Partial<FetchLimits>): FetchLimits {
  const result: FetchLimits = { ...base };
  if (overrides === undefined) return result;
  for (const key of Object.keys(base) as (keyof FetchLimits)[]) {
    const value = overrides[key];
    if (value !== undefined) result[key] = Math.min(base[key], value);
  }
  return result;
}

import type { FetchLimits } from '../../fetcher/models/fetch-limits.interface';

/**
 * Budget of one preview fetch. Below `REQUEST_TIMEOUT_MS` (8 s), so a slow site ends in the
 * fallback and not in a 504, and a create that fetches still has time to write.
 */
export const PREVIEW_FETCH_LIMITS: Partial<FetchLimits> = {
  totalTimeoutMs: 6_000,
  maxRedirects: 3,
};

import type { FetchLimits } from '../../fetcher/models/fetch-limits.interface';

const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * The Reader page request: tighter than the fetcher's defaults (the fetcher only lets a caller
 * tighten), so the fetch, the parse and the write fit well inside `REQUEST_TIMEOUT_MS`.
 */
export const READER_FETCH_LIMITS: Partial<FetchLimits> = {
  connectTimeoutMs: 2_500,
  totalTimeoutMs: 5_000,
  maxBodyBytes: BYTES_PER_MEGABYTE,
  maxRedirects: 4,
};

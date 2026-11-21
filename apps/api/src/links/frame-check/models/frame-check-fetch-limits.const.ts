import type { FetchLimits } from '../../../fetcher/models/fetch-limits.interface';

/** Limits of the frame-check request: only headers are read, so a short budget (#553). */
export const FRAME_CHECK_FETCH_LIMITS: Partial<FetchLimits> = {
  connectTimeoutMs: 2_000,
  totalTimeoutMs: 4_000,
  maxRedirects: 3,
};

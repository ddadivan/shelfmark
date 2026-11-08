import type { FetchLimits } from './fetch-limits.interface';

const BYTES_PER_MEGABYTE = 1024 * 1024;

/** ADR 0027: images may be 3 MB (pages 2 MB) but get 5 s and three redirects. Service options still win. */
export const DEFAULT_IMAGE_FETCH_LIMITS: Partial<FetchLimits> = {
  maxBodyBytes: 3 * BYTES_PER_MEGABYTE,
  totalTimeoutMs: 5_000,
  maxRedirects: 3,
};

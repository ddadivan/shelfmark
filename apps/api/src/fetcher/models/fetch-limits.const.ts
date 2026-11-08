import type { FetchLimits } from './fetch-limits.interface';

const BYTES_PER_MEGABYTE = 1024 * 1024;

export const DEFAULT_FETCH_LIMITS: FetchLimits = {
  maxRedirects: 5,
  connectTimeoutMs: 3_000,
  // PROJECT.md 7: a preview that takes longer than 8 s is dropped.
  totalTimeoutMs: 8_000,
  maxBodyBytes: 2 * BYTES_PER_MEGABYTE,
  maxUrlLength: 2_048,
};

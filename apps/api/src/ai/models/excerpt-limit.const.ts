import type { FetchLimits } from '../../fetcher/models/fetch-limits.interface';

const BYTES_PER_KILOBYTE = 1024;

/**
 * The page excerpt a link job reads (ADR 0049): at most `MaxChars` characters of visible text, taken
 * from a page fetched through the SSRF-safe fetcher within `FETCH_LIMITS` (4 s in total, 512 KB, at
 * most 3 redirects; the fetcher only lets a caller tighten its own limits).
 */
export const EXCERPT_LIMIT = {
  MaxChars: 6_000,
} as const;

export const EXCERPT_FETCH_LIMITS: Partial<FetchLimits> = {
  totalTimeoutMs: 4_000,
  maxBodyBytes: 512 * BYTES_PER_KILOBYTE,
  maxRedirects: 3,
};

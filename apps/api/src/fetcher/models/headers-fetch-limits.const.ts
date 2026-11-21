import type { FetchLimits } from './fetch-limits.interface';

/**
 * Headers mode (`fetchHeaders`, link preview frame check): only the response headers are read, so
 * 4 s in total and three redirects. Service options still win; per-call overrides only tighten.
 */
export const DEFAULT_HEADERS_FETCH_LIMITS: Partial<FetchLimits> = {
  totalTimeoutMs: 4_000,
  maxRedirects: 3,
};

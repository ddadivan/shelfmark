import type { FetchLimits } from './fetch-limits.interface';

const BYTES_PER_KILOBYTE = 1024;

/**
 * JSON mode (`fetchJson`): small API answers such as YouTube's oEmbed, so 64 KB, 3 s and two
 * redirects. Service options still win; per-call overrides only tighten.
 */
export const DEFAULT_JSON_FETCH_LIMITS: Partial<FetchLimits> = {
  maxBodyBytes: 64 * BYTES_PER_KILOBYTE,
  totalTimeoutMs: 3_000,
  maxRedirects: 2,
};

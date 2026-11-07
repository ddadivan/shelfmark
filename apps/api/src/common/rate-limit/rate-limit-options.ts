import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { RateLimitPreset } from './models/rate-limit-preset.interface';
import { perClientKey } from './rate-limit-key';
import { clientIp } from './client-ip';
import { RATE_LIMIT } from './models/rate-limit.const';
import { RATE_LIMIT_MESSAGE } from './models/rate-limit-message.const';

const ENABLED = '1';

/**
 * Forwarded-for headers are client-controlled unless a trusted proxy sets them: honour them only on
 * Vercel (`VERCEL=1`, which overwrites `x-vercel-forwarded-for`) or with the explicit opt-in
 * `TRUST_PROXY_HEADERS=1` (behind another trusted proxy, local dev and specs). Never implied by
 * a non-production `NODE_ENV`.
 */
export function shouldTrustProxyHeaders(env: NodeJS.ProcessEnv = process.env): boolean {
  return env['VERCEL'] === ENABLED || env['TRUST_PROXY_HEADERS'] === ENABLED;
}

/**
 * One `default` throttler per client IP with in-memory storage: best-effort per Vercel instance
 * (ADR 0031). Routes override it with `@RateLimit(...)`, the health check opts out. The guard sets
 * `Retry-After` on a block and throws a 429 that `AllExceptionsFilter` renders as `ApiError`.
 */
export function createRateLimitOptions(
  trustProxyHeaders: boolean,
  defaultLimit: RateLimitPreset = RATE_LIMIT.Default,
): ThrottlerModuleOptions {
  return {
    throttlers: [{ name: 'default', ...defaultLimit }],
    // One bucket per client across all routes; `@RateLimit` overrides keep per-route buckets.
    generateKey: (_context, tracker, name) => perClientKey(tracker, name),
    getTracker: (req) => clientIp(req, trustProxyHeaders),
    errorMessage: RATE_LIMIT_MESSAGE,
  };
}

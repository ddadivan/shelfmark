import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { clientIp } from './client-ip';
import { RATE_LIMIT } from './models/rate-limit.const';
import { RATE_LIMIT_MESSAGE } from './models/rate-limit-message.const';

const VERCEL_ENV_VALUE = '1';

/**
 * Forwarded-for headers are client-controlled unless a trusted proxy sets them: honour them only on
 * Vercel (`VERCEL=1`, which overwrites `x-vercel-forwarded-for`) or outside production.
 */
export function shouldTrustProxyHeaders(
  isProduction: boolean,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env['VERCEL'] === VERCEL_ENV_VALUE || !isProduction;
}

/**
 * One `default` throttler per client IP with in-memory storage: best-effort per Vercel instance
 * (ADR 0031). Routes override it with `@RateLimit(...)`, the health check opts out. The guard sets
 * `Retry-After` on a block and throws a 429 that `AllExceptionsFilter` renders as `ApiError`.
 */
export function createRateLimitOptions(trustProxyHeaders: boolean): ThrottlerModuleOptions {
  return {
    throttlers: [{ name: 'default', ...RATE_LIMIT.Default }],
    getTracker: (req) => clientIp(req, trustProxyHeaders),
    errorMessage: RATE_LIMIT_MESSAGE,
  };
}

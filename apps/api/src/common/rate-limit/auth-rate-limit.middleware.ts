import { createHash } from 'node:crypto';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_LOCAL } from '../request-id/request-id.middleware';
import { clientIp } from './client-ip';
import type { RateLimitPreset } from './models/rate-limit-preset.interface';
import { RATE_LIMIT } from './models/rate-limit.const';
import { RATE_LIMIT_MESSAGE } from './models/rate-limit-message.const';
import { RETRY_AFTER_HEADER } from './models/retry-after-header.const';

const AUTH_THROTTLER_NAME = 'auth';
const SESSION_PATH = '/api/auth/get-session';
const TOO_MANY_REQUESTS = 429;

/**
 * Stricter per-IP limit for sign-in, OAuth callback and sign-out. Better Auth is mounted outside
 * Nest's router, so the global guard never sees `/api/auth/*`. Runs after the allow-list (unknown
 * routes are already 404) and shares the throttler storage. `get-session` is exempt: the web calls
 * it on every page load. Answers in the `ApiError` shape with `Retry-After`.
 */
export function createAuthRateLimitMiddleware(
  storage: ThrottlerStorage,
  trustProxyHeaders: boolean,
  preset: RateLimitPreset = RATE_LIMIT.Auth,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!req.path.startsWith('/api/auth') || req.path === SESSION_PATH) {
      next();
      return;
    }
    const key = createHash('sha256')
      .update(`${AUTH_THROTTLER_NAME}-${clientIp(req, trustProxyHeaders)}`)
      .digest('hex');
    const { limit, ttl } = preset;
    storage.increment(key, ttl, limit, ttl, AUTH_THROTTLER_NAME).then((record) => {
      if (!record.isBlocked) {
        next();
        return;
      }
      res.setHeader(RETRY_AFTER_HEADER, record.timeToBlockExpire);
      res.status(TOO_MANY_REQUESTS).json({
        statusCode: TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: RATE_LIMIT_MESSAGE,
        requestId: String(res.locals[REQUEST_ID_LOCAL] ?? ''),
      });
    }, next);
  };
}

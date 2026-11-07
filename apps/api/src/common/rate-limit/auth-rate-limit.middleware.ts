import { createHash } from 'node:crypto';
import { STATUS_CODES } from 'node:http';
import { HttpStatus, Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_LOCAL } from '../request-id/request-id.middleware';
import { clientIp } from './client-ip';
import { AUTH_THROTTLER_NAME } from './models/auth-throttler-name.const';
import { RATE_LIMIT } from './models/rate-limit.const';
import { RATE_LIMIT_MESSAGE } from './models/rate-limit-message.const';
import type { RateLimitPreset } from './models/rate-limit-preset.interface';
import { RETRY_AFTER_HEADER } from './models/retry-after-header.const';

const SESSION_PATH = '/api/auth/get-session';
const logger = new Logger('AuthRateLimit');

function sendError(res: Response, statusCode: HttpStatus, message: string): void {
  res.status(statusCode).json({
    statusCode,
    error: STATUS_CODES[statusCode] ?? 'Error',
    message,
    requestId: String(res.locals[REQUEST_ID_LOCAL] ?? ''),
  });
}

/**
 * Stricter per-IP limit for sign-in, OAuth callback and sign-out. Better Auth is mounted outside
 * Nest's router, so the global guard never sees `/api/auth/*`. Runs after the allow-list (unknown
 * routes are already 404) and shares the throttler storage. `get-session` is exempt: the web calls
 * it on every page load. Answers in the `ApiError` shape with `Retry-After`. A storage failure
 * fails closed: a generic 500 `ApiError` (cause logged server-side), never a pass-through, so a
 * broken limiter cannot be used to skip the limit.
 */
export function createAuthRateLimitMiddleware(
  storage: ThrottlerStorage,
  trustProxyHeaders: boolean,
  preset: RateLimitPreset = RATE_LIMIT.Auth,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    if (!req.path.startsWith('/api/auth') || req.path === SESSION_PATH) {
      next();
      return;
    }
    const key = createHash('sha256')
      .update(`${AUTH_THROTTLER_NAME}-${clientIp(req, trustProxyHeaders)}`)
      .digest('hex');
    const { limit, ttl } = preset;
    let record: Awaited<ReturnType<ThrottlerStorage['increment']>>;
    try {
      record = await storage.increment(key, ttl, limit, ttl, AUTH_THROTTLER_NAME);
    } catch (error: unknown) {
      const requestId = String(res.locals[REQUEST_ID_LOCAL] ?? '');
      logger.error(
        `${req.method} ${req.path} 500 ${requestId}`,
        error instanceof Error ? error.stack : String(error),
      );
      sendError(res, HttpStatus.INTERNAL_SERVER_ERROR, STATUS_CODES[500] ?? 'Error');
      return;
    }
    if (!record.isBlocked) {
      next();
      return;
    }
    res.setHeader(RETRY_AFTER_HEADER, record.timeToBlockExpire);
    sendError(res, HttpStatus.TOO_MANY_REQUESTS, RATE_LIMIT_MESSAGE);
  };
}

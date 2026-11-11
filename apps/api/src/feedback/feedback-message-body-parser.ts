import { createHash } from 'node:crypto';
import { HttpStatus, Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { FEEDBACK_ENDPOINT } from '@shelfmark/contracts';
import { json, type Request, type RequestHandler } from 'express';
import { AUTH_COOKIE_PREFIX } from '../auth/models/auth-cookie-prefix.const';
import { AUTH_SESSION_COOKIE } from '../auth/models/auth-session-cookie.const';
import { sendApiError } from '../common/errors/send-api-error';
import { clientIp } from '../common/rate-limit/client-ip';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RATE_LIMIT_MESSAGE } from '../common/rate-limit/models/rate-limit-message.const';
import { RETRY_AFTER_HEADER } from '../common/rate-limit/models/retry-after-header.const';

/** A base64 image of `ScreenshotMaxBytes` is about 2.8 MB; the rest of the body is small. */
const BODY_LIMIT_BYTES = 3 * 1024 * 1024;
const THROTTLER_NAME = 'feedback-message-body';

const parser = json({ limit: BODY_LIMIT_BYTES });
const ROUTE = new RegExp(`^${FEEDBACK_ENDPOINT.Messages}/?$`);
const SESSION_COOKIE = new RegExp(
  `(?:^|;\\s*)(?:${AUTH_SESSION_COOKIE.SecurePrefix})?${AUTH_COOKIE_PREFIX}\\.${AUTH_SESSION_COOKIE.Name}=[^;\\s]`,
);
const logger = new Logger('FeedbackMessageBody');

function hasSessionCookie(req: Request): boolean {
  return SESSION_COOKIE.test(req.headers.cookie ?? '');
}

/**
 * Larger JSON parser (3 MB) for `POST /api/feedback/messages` only; every other request passes
 * through to the global 100kb parser. It runs before Nest's guards, so a cheap gate comes first and
 * nothing is read for a request that would be refused anyway: a declared `Content-Length` over the
 * cap is 413, a request without a session cookie is 401 (the real session check still follows in
 * `SessionAuthGuard`), and a per-IP throttle applies before the body is parsed.
 */
export function createFeedbackMessageBodyParser(
  storage: ThrottlerStorage,
  trustProxyHeaders: boolean,
): RequestHandler {
  return (req, res, next) => {
    if (req.method !== 'POST' || !ROUTE.test(req.path)) {
      next();
      return;
    }
    const length = Number(req.headers['content-length']);
    if (Number.isFinite(length) && length > BODY_LIMIT_BYTES) {
      sendApiError(res, HttpStatus.PAYLOAD_TOO_LARGE, 'Request body is too large');
      return;
    }
    if (!hasSessionCookie(req)) {
      sendApiError(res, HttpStatus.UNAUTHORIZED);
      return;
    }
    const key = createHash('sha256')
      .update(`${THROTTLER_NAME}-${clientIp(req, trustProxyHeaders)}`)
      .digest('hex');
    const { limit, ttl } = RATE_LIMIT.Feedback;
    storage
      .increment(key, ttl, limit, ttl, THROTTLER_NAME)
      .then((record) => {
        if (record.isBlocked) {
          res.setHeader(RETRY_AFTER_HEADER, record.timeToBlockExpire);
          sendApiError(res, HttpStatus.TOO_MANY_REQUESTS, RATE_LIMIT_MESSAGE);
          return;
        }
        parser(req, res, next);
      })
      .catch((error: unknown) => {
        // Fail closed, like the auth limiter.
        logger.error(
          `${req.method} ${req.path} 500`,
          error instanceof Error ? error.stack : String(error),
        );
        sendApiError(res, HttpStatus.INTERNAL_SERVER_ERROR);
      });
  };
}

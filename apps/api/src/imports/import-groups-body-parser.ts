import { createHash } from 'node:crypto';
import { HttpStatus, Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { IMPORT_ENDPOINT, IMPORT_LIMIT } from '@shelfmark/contracts';
import { json, type Request, type RequestHandler } from 'express';
import { AUTH_COOKIE_PREFIX } from '../auth/models/auth-cookie-prefix.const';
import { AUTH_SESSION_COOKIE } from '../auth/models/auth-session-cookie.const';
import { sendApiError } from '../common/errors/send-api-error';
import { clientIp } from '../common/rate-limit/client-ip';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RATE_LIMIT_MESSAGE } from '../common/rate-limit/models/rate-limit-message.const';
import { RETRY_AFTER_HEADER } from '../common/rate-limit/models/retry-after-header.const';

const parser = json({ limit: IMPORT_LIMIT.GroupBodyBytesMax });

interface GuardedRoute {
  /** Exactly one path, with or without a trailing slash. */
  pattern: RegExp;
  /** Throttler bucket and preset of the route (the same as its controller's `@RateLimit`). */
  name: string;
  preset: { limit: number; ttl: number };
}

/**
 * The only `POST` routes that take the larger body: the AI grouping of a file and the start of an
 * import (its folder tree can pass 100kb).
 */
const ROUTES: readonly GuardedRoute[] = [
  {
    pattern: new RegExp(`^${IMPORT_ENDPOINT.Groups}/?$`),
    name: 'import-groups-body',
    preset: RATE_LIMIT.ImportGroups,
  },
  {
    pattern: new RegExp(`^${IMPORT_ENDPOINT.Base}/?$`),
    name: 'import-start-body',
    preset: RATE_LIMIT.ImportStart,
  },
];
const SESSION_COOKIE = new RegExp(
  `(?:^|;\\s*)(?:${AUTH_SESSION_COOKIE.SecurePrefix})?${AUTH_COOKIE_PREFIX}\\.${AUTH_SESSION_COOKIE.Name}=[^;\\s]`,
);
const logger = new Logger('ImportGroupsBody');

function hasSessionCookie(req: Request): boolean {
  return SESSION_COOKIE.test(req.headers.cookie ?? '');
}

/**
 * Larger JSON parser (`IMPORT_LIMIT.GroupBodyBytesMax`) for exactly `POST /api/imports/groups` and
 * `POST /api/imports` (`ROUTES`); every
 * other request passes through to the global 100kb parser. It runs before Nest's guards, so a cheap
 * gate comes first and nothing is read for a request that would be refused anyway: a declared
 * `Content-Length` over the cap is 413, a request without a session cookie is 401 (the real session
 * check still follows in `SessionAuthGuard`), and a per-IP throttle applies before the body is
 * parsed (the same pattern as the feedback screenshot parser).
 */
export function createImportGroupsBodyParser(
  storage: ThrottlerStorage,
  trustProxyHeaders: boolean,
): RequestHandler {
  return (req, res, next) => {
    const route = req.method === 'POST' ? ROUTES.find((r) => r.pattern.test(req.path)) : undefined;
    if (route === undefined) {
      next();
      return;
    }
    const length = Number(req.headers['content-length']);
    if (Number.isFinite(length) && length > IMPORT_LIMIT.GroupBodyBytesMax) {
      sendApiError(res, HttpStatus.PAYLOAD_TOO_LARGE, 'Request body is too large');
      return;
    }
    if (!hasSessionCookie(req)) {
      sendApiError(res, HttpStatus.UNAUTHORIZED);
      return;
    }
    const key = createHash('sha256')
      .update(`${route.name}-${clientIp(req, trustProxyHeaders)}`)
      .digest('hex');
    const { limit, ttl } = route.preset;
    storage
      .increment(key, ttl, limit, ttl, route.name)
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

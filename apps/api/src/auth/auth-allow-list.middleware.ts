import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_LOCAL } from '../common/request-id/request-id.middleware';
import { ALLOWED_AUTH_ROUTES } from './models/allowed-auth-route.const';
import { AUTH_BASE_PATH } from './models/auth-base-path.const';

/** Resolves percent-encoding, case, repeated slashes and dot segments, as a router might. */
function normalise(rawPath: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    // Undecodable input is not something to wave through: treat it as guarded.
    return AUTH_BASE_PATH;
  }
  const segments: string[] = [];
  for (const segment of decoded.toLowerCase().split(/[/\\]+/)) {
    if (segment === '..') {
      segments.pop();
    } else if (segment !== '' && segment !== '.') {
      segments.push(segment);
    }
  }
  return `/${segments.join('/')}`;
}

function isUnderAuth(rawPath: string): boolean {
  const path = normalise(rawPath);
  return path === AUTH_BASE_PATH || path.startsWith(`${AUTH_BASE_PATH}/`);
}

/**
 * Allow-list in front of the Better Auth router. Anything that resolves into `/api/auth` and is not
 * exactly one of `ALLOWED_AUTH_ROUTES` (method and canonical path) gets a 404 in the `ApiError`
 * shape and never reaches Better Auth. This is the first layer; `disabledPaths` is the second.
 * It does not depend on which routes a future Better Auth version adds, and it also covers the
 * parameterised routes `disabledPaths` cannot list (`/reset-password/:token`).
 */
export function authAllowListMiddleware(req: Request, res: Response, next: NextFunction): void {
  const rawPath = req.originalUrl.split('?')[0];
  if (!isUnderAuth(rawPath)) {
    next();
    return;
  }
  const allowed = ALLOWED_AUTH_ROUTES.some(
    (route) => route.method === req.method && route.path.test(rawPath),
  );
  if (allowed) {
    next();
    return;
  }
  res.status(404).json({
    statusCode: 404,
    error: 'Not Found',
    message: 'Not Found',
    requestId: String(res.locals[REQUEST_ID_LOCAL] ?? ''),
  });
}

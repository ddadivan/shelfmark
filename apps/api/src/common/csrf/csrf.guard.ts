import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CSRF_CONTENT_TYPE_EXEMPT_ROUTE } from './models/csrf-content-type-exempt-route.const';

const SAFE_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS'];
const CROSS_SITE = 'cross-site';
const SAME_ORIGIN_FETCH_SITES: readonly (string | undefined)[] = [undefined, 'same-origin', 'none'];
const JSON_MIME = 'application/json';

function isSameOriginFetch(fetchSite: string | undefined): boolean {
  return SAME_ORIGIN_FETCH_SITES.includes(fetchSite);
}

function hasBody(req: Request): boolean {
  const length = req.headers['content-length'];
  return req.headers['transfer-encoding'] !== undefined || (length !== undefined && length !== '0');
}

function isJson(req: Request): boolean {
  const contentType = req.headers['content-type'];
  return contentType?.split(';')[0].trim().toLowerCase() === JSON_MIME;
}

/**
 * Global CSRF guard for the Nest routes (`/api/auth/*` has Better Auth's own checks and is mounted
 * outside Nest's router). For POST, PUT, PATCH and DELETE: an `Origin` header that is present and
 * not a trusted origin is a 403; a request with a body that is not `application/json` is a 415.
 * A present `Sec-Fetch-Site: cross-site` is a 403. Without an `Origin`, only `same-origin`, `none`
 * or no `Sec-Fetch-Site` is accepted (`same-site` is not), so non-browser clients still pass.
 * `POST /api/monitoring/tunnel` alone is exempt from the content-type rule (Sentry sends text/plain).
 * There is no state-changing `GET`.
 */
export class CsrfGuard implements CanActivate {
  private readonly trusted: ReadonlySet<string>;

  constructor(trustedOrigins: readonly string[]) {
    this.trusted = new Set(trustedOrigins);
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.includes(req.method)) return true;

    const origin = req.headers.origin;
    if (origin !== undefined && !this.trusted.has(origin)) {
      throw new ForbiddenException('Origin is not allowed');
    }
    const fetchSite = req.headers['sec-fetch-site'];
    if (fetchSite === CROSS_SITE || (origin === undefined && !isSameOriginFetch(fetchSite))) {
      throw new ForbiddenException('Cross-site request is not allowed');
    }
    // Narrow exemption from the content-type rule only (see the constant): exact method and path.
    const exempt =
      req.method === CSRF_CONTENT_TYPE_EXEMPT_ROUTE.method &&
      req.path === CSRF_CONTENT_TYPE_EXEMPT_ROUTE.path;
    if (!exempt && hasBody(req) && !isJson(req)) {
      throw new UnsupportedMediaTypeException('Content-Type must be application/json');
    }
    return true;
  }
}

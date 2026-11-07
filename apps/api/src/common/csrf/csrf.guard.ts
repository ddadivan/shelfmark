import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { Request } from 'express';

const SAFE_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS'];
const JSON_MIME = 'application/json';

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
 * A missing `Origin` is allowed (non-browser clients). There is no state-changing `GET`.
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
    if (hasBody(req) && !isJson(req)) {
      throw new UnsupportedMediaTypeException('Content-Type must be application/json');
    }
    return true;
  }
}

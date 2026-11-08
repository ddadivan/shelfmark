import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { AUTH_METADATA_KEY } from '../common/auth/models/auth-metadata-key.const';
import type { AuthenticatedRequest } from '../common/auth/models/authenticated-request.interface';
import { isRecord } from '../common/util/is-record';
import { enforceDemoExpiry } from './enforce-demo-expiry';
import { toAuthSessionResponse } from './to-auth-session-response';

/** Better Auth statuses that mean "no valid session". */
const NO_SESSION_STATUSES: readonly number[] = [400, 401, 403];
const TOO_MANY_REQUESTS = 429;

function statusOf(error: unknown): number | undefined {
  const status = isRecord(error) ? error['statusCode'] : undefined;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Global guard (ADR 0029): every route needs a valid session unless its handler carries
 * `@AllowAnonymous()`.
 * - The public marker is read from the handler only, so a class-level marker fails closed.
 * - The public check comes first, so public routes never touch the database.
 * - Read-only: `disableRefresh` keeps the sliding refresh with `GET /api/auth/get-session`, which
 *   sets the new cookie correctly.
 * - A demo user past `demoExpiresAt` (or without one) is a 401 (ADR 0034).
 * - The raw session (token, IP, user agent) never lands on the request: only the contract shape.
 * - Better Auth 400/401/403 is a 401. A 429 is a 503, so a throttled lookup does not sign the user
 *   out. Anything else (a database outage, another status) is rethrown and the error filter answers
 *   with that status or a generic 500, because the web signs the user out on 401.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean | undefined>(
      AUTH_METADATA_KEY.Public,
      context.getHandler(),
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    let raw: unknown;
    try {
      raw = await this.authService.api.getSession({
        headers: fromNodeHeaders(request.headers),
        query: { disableRefresh: true },
      });
    } catch (error) {
      const status = statusOf(error);
      if (status !== undefined && NO_SESSION_STATUSES.includes(status)) {
        throw new UnauthorizedException();
      }
      if (status === TOO_MANY_REQUESTS) throw new ServiceUnavailableException();
      throw error;
    }
    // Expired demo sandboxes are a 401 even while the cookie and the database session are still valid.
    const auth = enforceDemoExpiry(toAuthSessionResponse(raw));
    if (!auth) throw new UnauthorizedException();
    request.auth = auth;
    return true;
  }
}

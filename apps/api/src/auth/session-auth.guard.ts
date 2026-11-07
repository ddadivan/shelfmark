import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { AUTH_METADATA_KEY } from '../common/auth/models/auth-metadata-key.const';
import type { AuthenticatedRequest } from '../common/auth/models/authenticated-request.interface';
import { isRecord } from '../common/util/is-record';
import { toAuthSessionResponse } from './to-auth-session-response';

const CLIENT_ERROR_MAX = 499;

function isClientError(error: unknown): boolean {
  const status = isRecord(error) ? error['statusCode'] : undefined;
  return typeof status === 'number' && status >= 400 && status <= CLIENT_ERROR_MAX;
}

/**
 * Global guard (ADR 0029): every route needs a valid session unless it carries `@AllowAnonymous()`.
 * - The public check comes first, so public routes never touch the database.
 * - Read-only: `disableRefresh` keeps the sliding refresh with `GET /api/auth/get-session`, which
 *   sets the new cookie correctly.
 * - The raw session (token, IP, user agent) never lands on the request: only the contract shape.
 * - A Better Auth 4xx is a 401. Anything else (a database outage) is rethrown and becomes a
 *   generic 500, because the web signs the user out on 401.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      AUTH_METADATA_KEY.Public,
      [context.getHandler(), context.getClass()],
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
      if (isClientError(error)) throw new UnauthorizedException();
      throw error;
    }
    const auth = toAuthSessionResponse(raw);
    if (!auth) throw new UnauthorizedException();
    request.auth = auth;
    return true;
  }
}
